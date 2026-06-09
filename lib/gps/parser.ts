import type { ParsedMv930gPacket } from "@/lib/gps/types";
import type { GpsAccStatus } from "@/lib/gps/types";

const MESSAGE_TYPES: Record<string, ParsedMv930gPacket["packetType"]> = {
  "0102": "terminal_authentication",
  "0002": "heartbeat",
  "0200": "location_report"
};

export function normalizeHex(input: string | Buffer) {
  if (Buffer.isBuffer(input)) return input.toString("hex").toLowerCase();
  return input.replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "").toLowerCase();
}

export function parseMv930gPacket(input: string | Buffer): ParsedMv930gPacket {
  const rawHex = normalizeHex(input);
  const startsWithDelimiter = rawHex.startsWith("7e");
  const messageIdStart = startsWithDelimiter ? 2 : 0;
  const messageId = rawHex.slice(messageIdStart, messageIdStart + 4) || "unknown";
  const packetType = MESSAGE_TYPES[messageId] ?? "unknown";
  const deviceIdentifier = extractDeviceIdentifier(rawHex, startsWithDelimiter);
  const position = packetType === "location_report" ? parseLocationReport(rawHex, startsWithDelimiter) : null;

  return {
    packetType,
    messageId,
    deviceIdentifier,
    imei: null,
    occurredAt: position?.occurredAt ?? null,
    position: position
      ? {
          latitude: position.latitude,
          longitude: position.longitude,
          speedKmh: position.speedKmh,
          headingDegrees: position.headingDegrees,
          accStatus: position.accStatus,
          relayStatus: "unknown",
          vehicleVoltage: null
        }
      : null,
    payload: {
      message_id: messageId,
      device_id: deviceIdentifier,
      protocol_family: "mv930g_minimal_jt808",
      parser_note: "MVP parser only identifies 0x0102, 0x0002 and 0x0200. Full field mapping requires the vendor protocol document."
    }
  };
}

function extractDeviceIdentifier(rawHex: string, startsWithDelimiter: boolean) {
  const headerStart = startsWithDelimiter ? 2 : 0;
  const terminalPhoneStart = headerStart + 8;
  const candidate = rawHex.slice(terminalPhoneStart, terminalPhoneStart + 12);
  if (!candidate || candidate.length < 6) return null;
  return candidate.replace(/^0+/, "") || candidate;
}

function parseLocationReport(rawHex: string, startsWithDelimiter: boolean) {
  const headerStart = startsWithDelimiter ? 2 : 0;
  const bodyStart = headerStart + 24;
  const body = rawHex.slice(bodyStart);

  if (body.length < 56) return null;

  const statusHex = body.slice(8, 16);
  const latitudeHex = body.slice(16, 24);
  const longitudeHex = body.slice(24, 32);
  const speedHex = body.slice(36, 40);
  const headingHex = body.slice(40, 44);
  const timeHex = body.slice(44, 56);

  const latitudeRaw = parseInt(latitudeHex, 16);
  const longitudeRaw = parseInt(longitudeHex, 16);
  if (!Number.isFinite(latitudeRaw) || !Number.isFinite(longitudeRaw)) return null;

  const status = parseInt(statusHex, 16);
  const accStatus: GpsAccStatus = Number.isFinite(status) && (status & 0x1) === 1 ? "on" : "off";

  return {
    latitude: latitudeRaw / 1_000_000,
    longitude: longitudeRaw / 1_000_000,
    speedKmh: parseFiniteHex(speedHex, 10),
    headingDegrees: parseFiniteHex(headingHex),
    accStatus,
    occurredAt: parseBcdTimestamp(timeHex)
  };
}

function parseFiniteHex(hex: string, divisor = 1) {
  const value = parseInt(hex, 16);
  if (!Number.isFinite(value)) return null;
  return value / divisor;
}

function parseBcdTimestamp(hex: string) {
  if (!/^\d{12}$/.test(hex)) return null;
  const year = Number(`20${hex.slice(0, 2)}`);
  const month = Number(hex.slice(2, 4));
  const day = Number(hex.slice(4, 6));
  const hour = Number(hex.slice(6, 8));
  const minute = Number(hex.slice(8, 10));
  const second = Number(hex.slice(10, 12));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
