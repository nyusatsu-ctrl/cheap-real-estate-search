export type Jt808Position = {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  speedKmh: number;
  headingDegrees: number;
  accStatus: "on" | "off";
  positioningStatus: "positioned" | "not_positioned";
  relayStatus: "unknown";
  vehicleVoltage: number | null;
  alarmFlags: number;
  statusFlags: number;
  terminalTimeRaw: string;
  mileageKm: number | null;
  signalStrength: number | null;
  gnssSatellites: number | null;
  gpsSatellites: number | null;
  beidouSatellites: number | null;
  glonassSatellites: number | null;
  additionalStatus: { alarmFlags: number; switchStatus: number } | null;
  baseStation: {
    mcc: string;
    mnc: string;
    cells: Array<{ lacHex: string; cellIdHex: string; signalStrength: number }>;
  } | null;
  iccid: string | null;
};

export type ParsedServerMv930gPacket = {
  packetType:
    | "terminal_response"
    | "heartbeat"
    | "terminal_logout"
    | "terminal_registration"
    | "terminal_authentication"
    | "location_report"
    | "transparent_uplink"
    | "unknown";
  messageId: string;
  messageSerialNumber: number;
  protocolTerminalId: string;
  deviceIdentifier: string;
  imei: null;
  occurredAt: string | null;
  checksumValid: true;
  encryptionType: number;
  isSubpackage: boolean;
  supported: boolean;
  unsupportedReason: string | null;
  authenticationCode: Buffer | null;
  registration: Record<string, unknown> | null;
  terminalResponse: Record<string, unknown> | null;
  transparent: { type: number; payloadLength: number } | null;
  position: Jt808Position | null;
  payload: Record<string, unknown>;
};

export class Jt808ProtocolError extends Error {
  code: string;
}

export const JT808_MAX_FRAME_BYTES: number;
export const JT808_PARSER_VERSION: string;
export function normalizeHex(input: string | Buffer): string;
export function frameFingerprint(input: string | Buffer): string;
export function calculateJt808Checksum(input: Buffer | Uint8Array): number;
export function escapeJt808Payload(input: Buffer | Uint8Array): Buffer;
export function unescapeJt808Payload(input: Buffer | Uint8Array): Buffer;
export function parseJt808Frame(input: string | Buffer, options?: { maximumFrameBytes?: number }): Record<string, unknown>;
export function parseMv930gPacket(input: string | Buffer): ParsedServerMv930gPacket;
export function buildJt808Frame(input: {
  messageId: number;
  terminalId: string;
  serialNumber: number;
  body?: Buffer;
}): Buffer;
export function buildJt808CommonResponse(input: {
  terminalId: string;
  serialNumber: number;
  replySerialNumber: number;
  replyMessageId: number;
  result: number;
}): Buffer;
export function buildJt808RegistrationResponse(input: {
  terminalId: string;
  serialNumber: number;
  replySerialNumber: number;
  result: number;
  authenticationCode?: string | Buffer;
}): Buffer;
