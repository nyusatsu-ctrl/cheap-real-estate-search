import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildJt808CommonResponse,
  buildJt808RegistrationResponse,
  frameFingerprint,
  Jt808ProtocolError,
  JT808_PARSER_VERSION,
  normalizeHex,
  parseMv930gPacket
} from "@/server/mv930g/parser.mjs";

export type IngestRawDeviceLogInput = {
  transport: "tcp";
  raw: Buffer;
  remoteAddress?: string | null;
  remotePort?: number | null;
  localPort?: number | null;
  connectionTerminalId?: string | null;
  connectionAuthenticated?: boolean;
};

export type Jt808IngestResult = {
  rawLogId: string;
  parseStatus: "parsed" | "failed" | "unsupported";
  ack: Buffer | null;
  bindConnection: boolean;
  connectionAuthenticated: boolean;
  closeConnection: boolean;
};

type RegisteredDevice = {
  id: string;
  vehicle_id: string | null;
  jt808_auth_token_hash: string | null;
};

export async function ingestRawDeviceLog(
  supabase: SupabaseClient,
  input: IngestRawDeviceLogInput
): Promise<Jt808IngestResult> {
  const rawHex = normalizeHex(input.raw);
  const fingerprint = frameFingerprint(input.raw);
  const receivedAt = new Date().toISOString();
  const rawLog = await insertPendingRawLog(supabase, {
    ...input,
    rawHex,
    fingerprint,
    receivedAt
  });

  try {
    const duplicate = await findEarlierRawReceipt(supabase, rawLog.id, fingerprint);
    const parsed = parseMv930gPacket(input.raw);
    await updateRawMetadata(supabase, rawLog.id, parsed, duplicate?.id ?? null);

    if (!parsed.supported) {
      await recordProtocolFailure(supabase, rawLog.id, parsed.unsupportedReason ?? "unsupported_message_id", "unsupported");
      return noAck(rawLog.id, "unsupported", true, input.connectionAuthenticated === true);
    }

    if (input.connectionTerminalId && input.connectionTerminalId !== parsed.protocolTerminalId) {
      await recordProtocolFailure(supabase, rawLog.id, "connection_terminal_mismatch", "failed");
      return { ...noAck(rawLog.id, "failed", false, false), closeConnection: true };
    }

    const device = await findRegisteredDevice(supabase, parsed.protocolTerminalId);
    if (!device) {
      await recordProtocolFailure(supabase, rawLog.id, "unregistered_terminal", "failed");
      return noAck(rawLog.id, "failed", true, false);
    }

    if (parsed.packetType === "terminal_registration") {
      const authenticationCode = randomBytes(24).toString("base64url");
      await updateDevice(supabase, device.id, {
        jt808_auth_token_hash: hashAuthenticationCode(authenticationCode),
        jt808_auth_issued_at: receivedAt,
        jt808_registered_at: receivedAt,
        last_raw_log_id: rawLog.id,
        connection_status: "offline"
      });
      return {
        rawLogId: rawLog.id,
        parseStatus: "parsed",
        ack: buildJt808RegistrationResponse({
          terminalId: parsed.protocolTerminalId,
          serialNumber: parsed.messageSerialNumber,
          replySerialNumber: parsed.messageSerialNumber,
          result: 0,
          authenticationCode
        }),
        bindConnection: true,
        connectionAuthenticated: false,
        closeConnection: false
      };
    }

    if (parsed.packetType === "terminal_authentication") {
      if (!parsed.authenticationCode || !authenticationCodeMatches(parsed.authenticationCode, device.jt808_auth_token_hash)) {
        await recordProtocolFailure(supabase, rawLog.id, "terminal_authentication_failed", "failed");
        return noAck(rawLog.id, "failed", true, false);
      }
      await updateDevice(supabase, device.id, {
        connection_status: "online",
        last_seen_at: receivedAt,
        last_authenticated_at: receivedAt,
        last_raw_log_id: rawLog.id
      });
      return commonAck(rawLog.id, parsed, true);
    }

    if (input.connectionAuthenticated !== true || input.connectionTerminalId !== parsed.protocolTerminalId) {
      await recordProtocolFailure(supabase, rawLog.id, "connection_not_authenticated", "failed");
      return noAck(rawLog.id, "failed", true, false);
    }

    if (parsed.packetType === "location_report" && parsed.position) {
      await savePositionUnlessDuplicate(supabase, device, rawLog.id, fingerprint, parsed, receivedAt);
    }

    if (parsed.packetType === "terminal_logout") {
      await updateDevice(supabase, device.id, {
        connection_status: "offline",
        last_seen_at: receivedAt,
        last_raw_log_id: rawLog.id
      });
      return { ...noAck(rawLog.id, "parsed", true, false), closeConnection: true };
    }

    await updateDevice(supabase, device.id, {
      connection_status: "online",
      last_seen_at: receivedAt,
      last_raw_log_id: rawLog.id
    });

    if (["heartbeat", "location_report"].includes(parsed.packetType)) {
      return commonAck(rawLog.id, parsed, true);
    }

    return noAck(rawLog.id, "parsed", true, true);
  } catch (error) {
    if (error instanceof DatabaseOperationError) throw error;
    const code = error instanceof Jt808ProtocolError ? error.code : "parse_failed";
    try {
      await recordProtocolFailure(supabase, rawLog.id, code, "failed");
    } catch (recordError) {
      throw new DatabaseOperationError("parse_failure_record_failed", recordError);
    }
    return noAck(rawLog.id, "failed", false, false);
  }
}

async function insertPendingRawLog(
  supabase: SupabaseClient,
  input: IngestRawDeviceLogInput & { rawHex: string; fingerprint: string; receivedAt: string }
) {
  const result = await supabase
    .from("raw_device_logs")
    .insert({
      transport: input.transport,
      remote_address: input.remoteAddress ?? null,
      remote_port: input.remotePort ?? null,
      local_port: input.localPort ?? null,
      raw_hex: input.rawHex,
      raw_text: null,
      frame_fingerprint: input.fingerprint,
      parse_status: "pending",
      packet_type: "unknown",
      received_at: input.receivedAt
    })
    .select("id")
    .single();
  return requireData(result, "raw_insert_failed") as { id: string };
}

async function findEarlierRawReceipt(supabase: SupabaseClient, currentId: string, fingerprint: string) {
  const result = await supabase
    .from("raw_device_logs")
    .select("id")
    .eq("frame_fingerprint", fingerprint)
    .neq("id", currentId)
    .order("received_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return requireMaybeData(result, "raw_duplicate_lookup_failed") as { id: string } | null;
}

async function updateRawMetadata(
  supabase: SupabaseClient,
  rawLogId: string,
  parsed: ReturnType<typeof parseMv930gPacket>,
  duplicateOf: string | null
) {
  const status = parsed.supported ? "parsed" : "unsupported";
  const result = await supabase
    .from("raw_device_logs")
    .update({
      device_identifier: null,
      imei: null,
      protocol_terminal_id: parsed.protocolTerminalId,
      message_id: parsed.messageId,
      message_serial: parsed.messageSerialNumber,
      duplicate_of_raw_log_id: duplicateOf,
      checksum_valid: parsed.checksumValid,
      encryption_type: parsed.encryptionType,
      is_subpackage: parsed.isSubpackage,
      packet_type: parsed.packetType,
      parsed_payload: parsed.payload,
      parse_status: status
    })
    .eq("id", rawLogId)
    .select("id")
    .maybeSingle();
  requireUpdated(result, "raw_update_failed");
}

async function findRegisteredDevice(supabase: SupabaseClient, protocolTerminalId: string) {
  const result = await supabase
    .from("gps_devices")
    .select("id, vehicle_id, jt808_auth_token_hash")
    .eq("protocol_terminal_id", protocolTerminalId)
    .eq("is_active", true)
    .maybeSingle();
  return requireMaybeData(result, "device_lookup_failed") as RegisteredDevice | null;
}

async function savePositionUnlessDuplicate(
  supabase: SupabaseClient,
  device: RegisteredDevice,
  rawLogId: string,
  fingerprint: string,
  parsed: ReturnType<typeof parseMv930gPacket>,
  receivedAt: string
) {
  const existingResult = await supabase
    .from("gps_positions")
    .select("id")
    .eq("source_frame_fingerprint", fingerprint)
    .limit(1)
    .maybeSingle();
  const existing = requireMaybeData(existingResult, "position_duplicate_lookup_failed");
  if (existing) return;

  const position = parsed.position!;
  const result = await supabase.from("gps_positions").insert({
    device_id: device.id,
    vehicle_id: device.vehicle_id,
    raw_log_id: rawLogId,
    source_frame_fingerprint: fingerprint,
    latitude: position.latitude,
    longitude: position.longitude,
    altitude_meters: position.altitudeMeters,
    speed_kmh: position.speedKmh,
    heading_degrees: position.headingDegrees,
    acc_status: position.accStatus,
    positioning_status: position.positioningStatus,
    relay_status: "unknown",
    vehicle_voltage: position.vehicleVoltage,
    alarm_flags: position.alarmFlags,
    status_flags: position.statusFlags,
    terminal_time_raw: position.terminalTimeRaw,
    mileage_km: position.mileageKm,
    signal_strength: position.signalStrength,
    gnss_satellites: position.gnssSatellites,
    gps_satellites: position.gpsSatellites,
    beidou_satellites: position.beidouSatellites,
    glonass_satellites: position.glonassSatellites,
    additional_status: position.additionalStatus,
    base_station_info: position.baseStation,
    iccid: position.iccid,
    located_at: parsed.occurredAt,
    received_at: receivedAt
  });
  requireNoError(result, "position_insert_failed");
}

async function updateDevice(supabase: SupabaseClient, deviceId: string, values: Record<string, unknown>) {
  const result = await supabase
    .from("gps_devices")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", deviceId)
    .select("id")
    .maybeSingle();
  requireUpdated(result, "device_update_failed");
}

async function recordProtocolFailure(
  supabase: SupabaseClient,
  rawLogId: string,
  errorType: string,
  parseStatus: "failed" | "unsupported"
) {
  const updateResult = await supabase
    .from("raw_device_logs")
    .update({ parse_status: parseStatus })
    .eq("id", rawLogId)
    .select("id")
    .maybeSingle();
  requireUpdated(updateResult, "raw_failure_update_failed");
  const insertResult = await supabase.from("protocol_parse_errors").insert({
    raw_log_id: rawLogId,
    parser_version: JT808_PARSER_VERSION,
    error_type: errorType,
    error_message: "JT/T 808 frame was rejected by the receive-only ingest policy."
  });
  requireNoError(insertResult, "parse_error_insert_failed");
}

function commonAck(
  rawLogId: string,
  parsed: ReturnType<typeof parseMv930gPacket>,
  connectionAuthenticated: boolean
): Jt808IngestResult {
  return {
    rawLogId,
    parseStatus: "parsed",
    ack: buildJt808CommonResponse({
      terminalId: parsed.protocolTerminalId,
      serialNumber: parsed.messageSerialNumber,
      replySerialNumber: parsed.messageSerialNumber,
      replyMessageId: Number.parseInt(parsed.messageId, 16),
      result: 0
    }),
    bindConnection: true,
    connectionAuthenticated,
    closeConnection: false
  };
}

function noAck(
  rawLogId: string,
  parseStatus: Jt808IngestResult["parseStatus"],
  bindConnection: boolean,
  connectionAuthenticated: boolean
): Jt808IngestResult {
  return { rawLogId, parseStatus, ack: null, bindConnection, connectionAuthenticated, closeConnection: false };
}

function hashAuthenticationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function authenticationCodeMatches(received: Buffer, storedHash: string | null) {
  if (!storedHash || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  const receivedHash = createHash("sha256").update(received).digest();
  const expected = Buffer.from(storedHash, "hex");
  return receivedHash.length === expected.length && timingSafeEqual(receivedHash, expected);
}

function requireData(result: { data: unknown; error: unknown }, code: string) {
  if (result.error || !result.data) throw new DatabaseOperationError(code, result.error);
  return result.data;
}

function requireMaybeData(result: { data: unknown; error: unknown }, code: string) {
  if (result.error) throw new DatabaseOperationError(code, result.error);
  return result.data;
}

function requireUpdated(result: { data: unknown; error: unknown }, code: string) {
  if (result.error || !result.data) throw new DatabaseOperationError(code, result.error);
}

function requireNoError(result: { error: unknown }, code: string) {
  if (result.error) throw new DatabaseOperationError(code, result.error);
}

export class DatabaseOperationError extends Error {
  constructor(public readonly code: string, options?: unknown) {
    super("GPS database operation failed.", options instanceof Error ? { cause: options } : undefined);
    this.name = "DatabaseOperationError";
  }
}
