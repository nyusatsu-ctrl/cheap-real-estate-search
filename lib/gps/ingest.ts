import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeHex, parseMv930gPacket } from "@/lib/gps/parser";

export type IngestRawDeviceLogInput = {
  transport: "tcp" | "udp";
  raw: string | Buffer;
  remoteAddress?: string | null;
  remotePort?: number | null;
  localPort?: number | null;
};

export async function ingestRawDeviceLog(supabase: SupabaseClient, input: IngestRawDeviceLogInput) {
  const rawHex = normalizeHex(input.raw);
  const rawText = Buffer.isBuffer(input.raw) ? bufferToPrintableText(input.raw) : input.raw;
  const receivedAt = new Date().toISOString();

  const { data: rawLog, error: insertError } = await supabase
    .from("raw_device_logs")
    .insert({
      transport: input.transport,
      remote_address: input.remoteAddress ?? null,
      remote_port: input.remotePort ?? null,
      local_port: input.localPort ?? null,
      raw_hex: rawHex,
      raw_text: rawText,
      parse_status: "pending",
      packet_type: "unknown",
      received_at: receivedAt
    })
    .select("*")
    .single();

  if (insertError) throw new Error(insertError.message);

  try {
    const parsed = parseMv930gPacket(rawHex);
    const parseStatus = parsed.packetType === "unknown" ? "unsupported" : "parsed";

    await supabase
      .from("raw_device_logs")
      .update({
        device_identifier: parsed.deviceIdentifier,
        imei: parsed.imei,
        packet_type: parsed.packetType,
        parsed_payload: parsed.payload,
        parse_status: parseStatus
      })
      .eq("id", rawLog.id);

    const device = await findDevice(supabase, parsed.deviceIdentifier, parsed.imei);
    if (device) {
      await supabase
        .from("gps_devices")
        .update({
          connection_status: "online",
          last_seen_at: receivedAt,
          last_raw_log_id: rawLog.id
        })
        .eq("id", device.id);

      if (parsed.position) {
        await supabase.from("gps_positions").insert({
          device_id: device.id,
          vehicle_id: device.vehicle_id,
          raw_log_id: rawLog.id,
          latitude: parsed.position.latitude,
          longitude: parsed.position.longitude,
          speed_kmh: parsed.position.speedKmh,
          heading_degrees: parsed.position.headingDegrees,
          acc_status: parsed.position.accStatus,
          relay_status: parsed.position.relayStatus,
          vehicle_voltage: parsed.position.vehicleVoltage,
          located_at: parsed.occurredAt,
          received_at: receivedAt
        });
      }
    }

    if (parseStatus === "unsupported") {
      await supabase.from("protocol_parse_errors").insert({
        raw_log_id: rawLog.id,
        parser_version: "mv930g-mvp-1",
        error_type: "unsupported_message_id",
        error_message: `Unsupported MV930G message_id: ${parsed.messageId}`
      });
    }

    return { rawLogId: rawLog.id as string, parsed, parseStatus, deviceId: device?.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    await supabase.from("raw_device_logs").update({ parse_status: "failed" }).eq("id", rawLog.id);
    await supabase.from("protocol_parse_errors").insert({
      raw_log_id: rawLog.id,
      parser_version: "mv930g-mvp-1",
      error_type: "parse_failed",
      error_message: message
    });
    return { rawLogId: rawLog.id as string, parsed: null, parseStatus: "failed", deviceId: null };
  }
}

async function findDevice(supabase: SupabaseClient, deviceIdentifier: string | null, imei: string | null) {
  if (deviceIdentifier) {
    const { data } = await supabase
      .from("gps_devices")
      .select("id, vehicle_id")
      .eq("device_identifier", deviceIdentifier)
      .maybeSingle();
    if (data) return data as { id: string; vehicle_id: string | null };
  }

  if (imei) {
    const { data } = await supabase.from("gps_devices").select("id, vehicle_id").eq("imei", imei).maybeSingle();
    if (data) return data as { id: string; vehicle_id: string | null };
  }

  return null;
}

function bufferToPrintableText(buffer: Buffer) {
  const text = buffer.toString("utf8");
  return /[\u0000-\u0008\u000e-\u001f]/.test(text) ? null : text;
}
