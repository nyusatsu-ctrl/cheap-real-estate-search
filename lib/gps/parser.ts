import type { ParsedMv930gPacket } from "@/lib/gps/types";
import {
  normalizeHex as normalizeJt808Hex,
  parseMv930gPacket as parseServerMv930gPacket
} from "@/server/mv930g/parser.mjs";

export function normalizeHex(input: string | Buffer) {
  return normalizeJt808Hex(input);
}

export function parseMv930gPacket(input: string | Buffer): ParsedMv930gPacket {
  const { authenticationCode: _authenticationCode, ...safePacket } = parseServerMv930gPacket(input);
  void _authenticationCode;
  return safePacket as ParsedMv930gPacket;
}
