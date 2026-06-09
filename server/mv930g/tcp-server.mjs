import net from "node:net";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env.mjs";
import { normalizeHex, parseMv930gPacket } from "./parser.mjs";

loadLocalEnv();

const port = Number(process.env.MV930G_TCP_PORT ?? 9300);
const host = process.env.MV930G_TCP_HOST ?? "0.0.0.0";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const server = net.createServer((socket) => {
  socket.on("data", async (buffer) => {
    try {
      const result = await saveRawLogThenParse(buffer, {
        remoteAddress: socket.remoteAddress ?? null,
        remotePort: socket.remotePort ?? null,
        localPort: port
      });
      socket.write(Buffer.from("01", "hex"));
      console.log(`[mv930g] saved raw_log=${result.rawLogId} message_id=${result.messageId} parse=${result.parseStatus}`);
    } catch (error) {
      console.error("[mv930g] failed to save raw log", error);
      socket.write(Buffer.from("00", "hex"));
      socket.end();
    }
  });
});

server.on("error", (error) => {
  console.error(`[mv930g] TCP server error: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`[mv930g] TCP server listening on ${host}:${port}`);
});

async function saveRawLogThenParse(buffer, meta) {
  const rawHex = normalizeHex(buffer);
  const receivedAt = new Date().toISOString();
  const { data: rawLog, error: insertError } = await supabase
    .from("raw_device_logs")
    .insert({
      transport: "tcp",
      remote_address: meta.remoteAddress,
      remote_port: meta.remotePort,
      local_port: meta.localPort,
      raw_hex: rawHex,
      raw_text: printableText(buffer),
      packet_type: "unknown",
      parse_status: "pending",
      received_at: receivedAt
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

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

    const device = await findDevice(parsed.deviceIdentifier, parsed.imei);
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

    return { rawLogId: rawLog.id, messageId: parsed.messageId, parseStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    await supabase.from("raw_device_logs").update({ parse_status: "failed" }).eq("id", rawLog.id);
    await supabase.from("protocol_parse_errors").insert({
      raw_log_id: rawLog.id,
      parser_version: "mv930g-mvp-1",
      error_type: "parse_failed",
      error_message: message
    });
    return { rawLogId: rawLog.id, messageId: "unknown", parseStatus: "failed" };
  }
}

async function findDevice(deviceIdentifier, imei) {
  if (deviceIdentifier) {
    const { data } = await supabase
      .from("gps_devices")
      .select("id, vehicle_id")
      .eq("device_identifier", deviceIdentifier)
      .maybeSingle();
    if (data) return data;
  }

  if (imei) {
    const { data } = await supabase.from("gps_devices").select("id, vehicle_id").eq("imei", imei).maybeSingle();
    if (data) return data;
  }

  return null;
}

function printableText(buffer) {
  const text = buffer.toString("utf8");
  return /[\u0000-\u0008\u000e-\u001f]/.test(text) ? null : text;
}
