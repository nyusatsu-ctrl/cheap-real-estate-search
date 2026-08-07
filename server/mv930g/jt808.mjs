import { createHash } from "node:crypto";

export const JT808_DELIMITER = 0x7e;
export const JT808_ESCAPE = 0x7d;
export const JT808_MAX_FRAME_BYTES = 4 * 1024;
export const JT808_PARSER_VERSION = "mv930g-jt808-2013-1";

const MESSAGE_TYPES = Object.freeze({
  0x0001: "terminal_response",
  0x0002: "heartbeat",
  0x0003: "terminal_logout",
  0x0100: "terminal_registration",
  0x0102: "terminal_authentication",
  0x0200: "location_report",
  0x0900: "transparent_uplink"
});

export class Jt808ProtocolError extends Error {
  constructor(code, message = "Invalid JT/T 808 frame.") {
    super(message);
    this.name = "Jt808ProtocolError";
    this.code = code;
  }
}

export function normalizeHex(input) {
  if (Buffer.isBuffer(input)) return input.toString("hex").toLowerCase();
  return String(input).replace(/^0x/i, "").replace(/[^0-9a-f]/gi, "").toLowerCase();
}

export function frameFingerprint(input) {
  const frame = normalizeFrameBuffer(input);
  return createHash("sha256").update(frame).digest("hex");
}

export function calculateJt808Checksum(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let checksum = 0;
  for (const byte of bytes) checksum ^= byte;
  return checksum;
}

export function escapeJt808Payload(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const output = [];
  for (const byte of bytes) {
    if (byte === 0x7d) output.push(0x7d, 0x01);
    else if (byte === 0x7e) output.push(0x7d, 0x02);
    else output.push(byte);
  }
  return Buffer.from(output);
}

export function unescapeJt808Payload(input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const output = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte !== 0x7d) {
      output.push(byte);
      continue;
    }

    const escaped = bytes[index + 1];
    if (escaped === 0x01) output.push(0x7d);
    else if (escaped === 0x02) output.push(0x7e);
    else throw new Jt808ProtocolError("invalid_escape_sequence");
    index += 1;
  }
  return Buffer.from(output);
}

export function parseJt808Frame(input, options = {}) {
  const maximumFrameBytes = options.maximumFrameBytes ?? JT808_MAX_FRAME_BYTES;
  const frame = normalizeFrameBuffer(input);
  if (frame.length > maximumFrameBytes) throw new Jt808ProtocolError("frame_too_large");
  if (frame.length < 15) throw new Jt808ProtocolError("frame_too_short");
  if (frame[0] !== JT808_DELIMITER || frame.at(-1) !== JT808_DELIMITER) {
    throw new Jt808ProtocolError("missing_frame_delimiter");
  }

  const decoded = unescapeJt808Payload(frame.subarray(1, -1));
  if (decoded.length < 13) throw new Jt808ProtocolError("frame_too_short");

  const payload = decoded.subarray(0, -1);
  const receivedChecksum = decoded.at(-1);
  const calculatedChecksum = calculateJt808Checksum(payload);
  if (receivedChecksum !== calculatedChecksum) {
    throw new Jt808ProtocolError("checksum_mismatch");
  }

  const messageId = payload.readUInt16BE(0);
  const bodyProperties = payload.readUInt16BE(2);
  const bodyLength = bodyProperties & 0x03ff;
  const encryptionType = (bodyProperties >> 10) & 0x07;
  const isSubpackage = (bodyProperties & 0x2000) !== 0;
  const terminalId = decodeBcd(payload.subarray(4, 10), "terminal_id_bcd_invalid");
  const serialNumber = payload.readUInt16BE(10);
  const headerLength = isSubpackage ? 16 : 12;

  if (payload.length !== headerLength + bodyLength) {
    throw new Jt808ProtocolError("body_length_mismatch");
  }

  const packageInfo = isSubpackage
    ? {
        totalPackets: payload.readUInt16BE(12),
        packetSequence: payload.readUInt16BE(14)
      }
    : null;
  const body = payload.subarray(headerLength);
  const packetType = MESSAGE_TYPES[messageId] ?? "unknown";
  const unsupportedReason = encryptionType !== 0
    ? "encrypted_body_not_supported"
    : isSubpackage
      ? "subpackage_reassembly_not_supported"
      : null;
  const message = unsupportedReason ? {} : parseMessageBody(messageId, body);

  return {
    frame,
    checksumValid: true,
    calculatedChecksum,
    receivedChecksum,
    messageId,
    messageIdHex: messageId.toString(16).padStart(4, "0"),
    packetType,
    bodyProperties,
    bodyLength,
    encryptionType,
    isSubpackage,
    packageInfo,
    terminalId,
    serialNumber,
    body,
    supported: unsupportedReason === null && packetType !== "unknown",
    unsupportedReason: unsupportedReason ?? (packetType === "unknown" ? "unsupported_message_id" : null),
    ...message
  };
}

export function buildJt808Frame({ messageId, terminalId, serialNumber, body = Buffer.alloc(0) }) {
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (bodyBuffer.length > 0x03ff) throw new Jt808ProtocolError("response_body_too_large");
  const header = Buffer.alloc(12);
  header.writeUInt16BE(messageId, 0);
  header.writeUInt16BE(bodyBuffer.length, 2);
  encodeBcdTerminalId(terminalId).copy(header, 4);
  header.writeUInt16BE(serialNumber & 0xffff, 10);
  const payload = Buffer.concat([header, bodyBuffer]);
  const checksum = Buffer.from([calculateJt808Checksum(payload)]);
  return Buffer.concat([
    Buffer.from([JT808_DELIMITER]),
    escapeJt808Payload(Buffer.concat([payload, checksum])),
    Buffer.from([JT808_DELIMITER])
  ]);
}

export function buildJt808CommonResponse({ terminalId, serialNumber, replySerialNumber, replyMessageId, result }) {
  const body = Buffer.alloc(5);
  body.writeUInt16BE(replySerialNumber & 0xffff, 0);
  body.writeUInt16BE(replyMessageId & 0xffff, 2);
  body[4] = result & 0xff;
  return buildJt808Frame({ messageId: 0x8001, terminalId, serialNumber, body });
}

export function buildJt808RegistrationResponse({ terminalId, serialNumber, replySerialNumber, result, authenticationCode }) {
  const code = result === 0
    ? Buffer.isBuffer(authenticationCode)
      ? authenticationCode
      : Buffer.from(String(authenticationCode ?? ""), "ascii")
    : Buffer.alloc(0);
  if (result === 0 && code.length === 0) throw new Jt808ProtocolError("authentication_code_required");
  const body = Buffer.alloc(3 + code.length);
  body.writeUInt16BE(replySerialNumber & 0xffff, 0);
  body[2] = result & 0xff;
  code.copy(body, 3);
  return buildJt808Frame({ messageId: 0x8100, terminalId, serialNumber, body });
}

export function parseMv930gPacket(input) {
  const parsed = parseJt808Frame(input);
  const position = parsed.location
    ? {
        latitude: parsed.location.latitude,
        longitude: parsed.location.longitude,
        altitudeMeters: parsed.location.altitudeMeters,
        speedKmh: parsed.location.speedKmh,
        headingDegrees: parsed.location.headingDegrees,
        accStatus: parsed.location.accOn ? "on" : "off",
        positioningStatus: parsed.location.positioned ? "positioned" : "not_positioned",
        relayStatus: "unknown",
        vehicleVoltage: parsed.location.additional.externalPowerVoltage ?? null,
        alarmFlags: parsed.location.alarmFlags,
        statusFlags: parsed.location.statusFlags,
        terminalTimeRaw: parsed.location.terminalTimeRaw,
        mileageKm: parsed.location.additional.mileageKm ?? null,
        signalStrength: parsed.location.additional.signalStrength ?? null,
        gnssSatellites: parsed.location.additional.gnssSatellites ?? null,
        gpsSatellites: parsed.location.additional.gpsSatellites ?? null,
        beidouSatellites: parsed.location.additional.beidouSatellites ?? null,
        glonassSatellites: parsed.location.additional.glonassSatellites ?? null,
        additionalStatus: parsed.location.additional.status57 ?? null,
        baseStation: parsed.location.additional.baseStation ?? null,
        iccid: parsed.location.additional.iccid ?? null
      }
    : null;

  return {
    packetType: parsed.packetType,
    messageId: parsed.messageIdHex,
    messageSerialNumber: parsed.serialNumber,
    protocolTerminalId: parsed.terminalId,
    deviceIdentifier: parsed.terminalId,
    imei: null,
    occurredAt: parsed.location?.occurredAt ?? null,
    checksumValid: parsed.checksumValid,
    encryptionType: parsed.encryptionType,
    isSubpackage: parsed.isSubpackage,
    supported: parsed.supported,
    unsupportedReason: parsed.unsupportedReason,
    authenticationCode: parsed.authenticationCode ?? null,
    registration: parsed.registration ?? null,
    terminalResponse: parsed.terminalResponse ?? null,
    transparent: parsed.transparent ?? null,
    position,
    payload: {
      message_id: parsed.messageIdHex,
      message_serial_number: parsed.serialNumber,
      protocol_terminal_id: parsed.terminalId,
      protocol_family: "jt808_2013",
      parser_version: JT808_PARSER_VERSION,
      encryption_type: parsed.encryptionType,
      is_subpackage: parsed.isSubpackage,
      unsupported_reason: parsed.unsupportedReason,
      registration: parsed.registration ? sanitizeRegistration(parsed.registration) : null,
      terminal_response: parsed.terminalResponse ?? null,
      transparent_type: parsed.transparent?.type ?? null,
      position: position ? { ...position, iccid: position.iccid } : null
    }
  };
}

function parseMessageBody(messageId, body) {
  switch (messageId) {
    case 0x0001:
      return { terminalResponse: parseTerminalResponse(body) };
    case 0x0002:
    case 0x0003:
      if (body.length !== 0) throw new Jt808ProtocolError("unexpected_message_body");
      return {};
    case 0x0100:
      return { registration: parseRegistration(body) };
    case 0x0102:
      if (body.length === 0) throw new Jt808ProtocolError("authentication_code_missing");
      return { authenticationCode: Buffer.from(body) };
    case 0x0200:
      return { location: parseLocation(body) };
    case 0x0900:
      if (body.length < 1) throw new Jt808ProtocolError("transparent_body_missing");
      return { transparent: { type: body[0], payloadLength: body.length - 1 } };
    default:
      return {};
  }
}

function parseTerminalResponse(body) {
  if (body.length !== 5) throw new Jt808ProtocolError("terminal_response_length_invalid");
  return {
    replySerialNumber: body.readUInt16BE(0),
    replyMessageId: body.readUInt16BE(2),
    result: body[4]
  };
}

function parseRegistration(body) {
  if (body.length < 37) throw new Jt808ProtocolError("registration_body_too_short");
  return {
    provinceId: body.readUInt16BE(0),
    cityId: body.readUInt16BE(2),
    manufacturerId: decodeTrimmedAscii(body.subarray(4, 9)),
    terminalModel: decodeTrimmedAscii(body.subarray(9, 29)),
    manufacturerTerminalId: decodeTrimmedAscii(body.subarray(29, 36)),
    plateColor: body[36],
    plateLength: body.length - 37
  };
}

function parseLocation(body) {
  if (body.length < 28) throw new Jt808ProtocolError("location_body_too_short");
  const alarmFlags = body.readUInt32BE(0);
  const statusFlags = body.readUInt32BE(4);
  const latitudeMagnitude = body.readUInt32BE(8) / 1_000_000;
  const longitudeMagnitude = body.readUInt32BE(12) / 1_000_000;
  const terminalTimeRaw = decodeBcd(body.subarray(22, 28), "timestamp_bcd_invalid");
  const occurredAt = parseGmt8Timestamp(terminalTimeRaw);
  const additional = parseLocationAdditional(body.subarray(28));
  return {
    alarmFlags,
    statusFlags,
    accOn: (statusFlags & 0x01) !== 0,
    positioned: (statusFlags & 0x02) !== 0,
    latitude: (statusFlags & 0x04) !== 0 ? -latitudeMagnitude : latitudeMagnitude,
    longitude: (statusFlags & 0x08) !== 0 ? -longitudeMagnitude : longitudeMagnitude,
    altitudeMeters: body.readUInt16BE(16),
    speedKmh: body.readUInt16BE(18) / 10,
    headingDegrees: body.readUInt16BE(20),
    terminalTimeRaw,
    occurredAt,
    additional
  };
}

function parseLocationAdditional(bytes) {
  const additional = {};
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 2 > bytes.length) throw new Jt808ProtocolError("additional_item_header_truncated");
    const id = bytes[offset];
    const length = bytes[offset + 1];
    offset += 2;
    if (offset + length > bytes.length) throw new Jt808ProtocolError("additional_item_body_truncated");
    const value = bytes.subarray(offset, offset + length);
    offset += length;

    if (id === 0x01 && length === 4) additional.mileageKm = value.readUInt32BE(0) / 10;
    else if (id === 0x30 && length === 1) additional.signalStrength = value[0];
    else if (id === 0x31 && length === 1) additional.gnssSatellites = value[0];
    else if (id === 0x32 && length === 1) additional.gpsSatellites = value[0];
    else if (id === 0x33 && length === 1) additional.beidouSatellites = value[0];
    else if (id === 0x34 && length === 1) additional.glonassSatellites = value[0];
    else if (id === 0x82 && length === 2) additional.externalPowerVoltage = value.readUInt16BE(0) / 10;
    else if (id === 0x57 && length === 8) {
      additional.status57 = {
        alarmFlags: value.readUInt16BE(0),
        switchStatus: value.readUInt16BE(2)
      };
    } else if (id === 0x9f) additional.baseStation = parseBaseStation(value);
    else if (id === 0xcc && length === 20) {
      const candidate = decodeTrimmedAscii(value);
      additional.iccid = /^\d{18,22}$/.test(candidate) ? candidate : null;
    }
  }
  return additional;
}

function parseGmt8Timestamp(value) {
  if (!/^\d{12}$/.test(value)) throw new Jt808ProtocolError("timestamp_bcd_invalid");
  const year = Number(`20${value.slice(0, 2)}`);
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const hour = Number(value.slice(6, 8));
  const minute = Number(value.slice(8, 10));
  const second = Number(value.slice(10, 12));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    throw new Jt808ProtocolError("timestamp_value_invalid");
  }
  const localClock = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    localClock.getUTCFullYear() !== year
    || localClock.getUTCMonth() !== month - 1
    || localClock.getUTCDate() !== day
    || localClock.getUTCHours() !== hour
    || localClock.getUTCMinutes() !== minute
    || localClock.getUTCSeconds() !== second
  ) {
    throw new Jt808ProtocolError("timestamp_value_invalid");
  }
  const date = new Date(localClock.getTime() - 8 * 60 * 60 * 1000);
  if (Number.isNaN(date.getTime())) throw new Jt808ProtocolError("timestamp_value_invalid");
  return date.toISOString();
}

function decodeBcd(bytes, errorCode) {
  let output = "";
  for (const byte of bytes) {
    const high = byte >> 4;
    const low = byte & 0x0f;
    if (high > 9 || low > 9) throw new Jt808ProtocolError(errorCode);
    output += `${high}${low}`;
  }
  return output;
}

function parseBaseStation(value) {
  const text = decodeTrimmedAscii(value);
  const fields = text.split(",");
  if (fields.length < 5 || (fields.length - 2) % 3 !== 0 || fields.length > 11) return null;
  if (!/^\d{3}$/.test(fields[0]) || !/^\d{2,3}$/.test(fields[1])) return null;
  const cells = [];
  for (let index = 2; index < fields.length; index += 3) {
    if (!/^[a-f0-9]+$/i.test(fields[index]) || !/^[a-f0-9]+$/i.test(fields[index + 1])) return null;
    const signalStrength = Number(fields[index + 2]);
    if (!Number.isInteger(signalStrength) || signalStrength < 0 || signalStrength > 255) return null;
    cells.push({
      lacHex: fields[index].toLowerCase(),
      cellIdHex: fields[index + 1].toLowerCase(),
      signalStrength
    });
  }
  return { mcc: fields[0], mnc: fields[1], cells };
}

function encodeBcdTerminalId(value) {
  const normalized = String(value ?? "");
  if (!/^\d{12}$/.test(normalized)) throw new Jt808ProtocolError("terminal_id_invalid");
  const output = Buffer.alloc(6);
  for (let index = 0; index < 6; index += 1) {
    output[index] = Number(normalized[index * 2]) * 16 + Number(normalized[index * 2 + 1]);
  }
  return output;
}

function decodeTrimmedAscii(value) {
  return value.toString("ascii").replace(/[\u0000 ]+$/g, "");
}

function normalizeFrameBuffer(input) {
  if (Buffer.isBuffer(input)) return Buffer.from(input);
  const normalized = normalizeHex(input);
  if (!normalized || normalized.length % 2 !== 0) throw new Jt808ProtocolError("hex_input_invalid");
  return Buffer.from(normalized, "hex");
}

function sanitizeRegistration(registration) {
  return {
    province_id: registration.provinceId,
    city_id: registration.cityId,
    manufacturer_id: registration.manufacturerId,
    terminal_model: registration.terminalModel,
    plate_color: registration.plateColor,
    plate_length: registration.plateLength
  };
}
