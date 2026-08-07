import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Jt808FrameStream } from "../server/mv930g/frame-stream.mjs";
import {
  createSignedIngestRequest,
  INGEST_SIGNATURE_HEADER,
  validateIngestAck
} from "../server/mv930g/ingest-client.mjs";
import {
  buildJt808CommonResponse,
  buildJt808Frame,
  buildJt808RegistrationResponse,
  calculateJt808Checksum,
  escapeJt808Payload,
  frameFingerprint,
  Jt808ProtocolError,
  parseJt808Frame,
  parseMv930gPacket,
  unescapeJt808Payload
} from "../server/mv930g/parser.mjs";
import { startMv930gReceiver } from "../server/mv930g/tcp-server.mjs";
import { PermissionRestrictedSpool, SpoolCapacityError } from "../server/mv930g/spool.mjs";
import {
  reserveGpsIngestNonce,
  verifyGpsIngestSignature
} from "../lib/gps/ingest-security.ts";
import { maskGpsIdentifier } from "../lib/gps/sensitive.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syntheticTerminalId = `${"0".repeat(11)}1`;

test("正式JT/T 808 heartbeatと位置追加情報を検証・解析する", () => {
  const heartbeat = buildJt808Frame({ messageId: 0x0002, terminalId: syntheticTerminalId, serialNumber: 7 });
  const parsedHeartbeat = parseMv930gPacket(heartbeat);
  assert.equal(parsedHeartbeat.packetType, "heartbeat");
  assert.equal(parsedHeartbeat.checksumValid, true);

  const location = buildJt808Frame({
    messageId: 0x0200,
    terminalId: syntheticTerminalId,
    serialNumber: 8,
    body: createLocationBody()
  });
  const parsed = parseMv930gPacket(location);
  assert.equal(parsed.packetType, "location_report");
  assert.equal(parsed.position?.accStatus, "on");
  assert.equal(parsed.position?.positioningStatus, "positioned");
  assert.equal(parsed.position?.latitude, -12.345678);
  assert.equal(parsed.position?.longitude, -98.765432);
  assert.equal(parsed.position?.altitudeMeters, 123);
  assert.equal(parsed.position?.speedKmh, 45.6);
  assert.equal(parsed.position?.headingDegrees, 270);
  assert.equal(parsed.occurredAt, "2026-08-06T04:00:00.000Z");
  assert.equal(parsed.position?.mileageKm, 1234.5);
  assert.equal(parsed.position?.signalStrength, 20);
  assert.equal(parsed.position?.gnssSatellites, 9);
  assert.equal(parsed.position?.gpsSatellites, 6);
  assert.equal(parsed.position?.beidouSatellites, 2);
  assert.equal(parsed.position?.glonassSatellites, 1);
  assert.equal(parsed.position?.vehicleVoltage, 13.5);
  assert.deepEqual(parsed.position?.additionalStatus, { alarmFlags: 0x0100, switchStatus: 0x0001 });
  assert.equal(parsed.position?.baseStation?.cells.length, 1);
  assert.equal(parsed.position?.iccid, "0".repeat(20));
});

test("登録、認証、logout、端末共通応答、上り透過伝送を受信解析する", () => {
  const registrationBody = Buffer.alloc(37 + 3);
  registrationBody.writeUInt16BE(1, 0);
  registrationBody.writeUInt16BE(2, 2);
  Buffer.from("TEST1", "ascii").copy(registrationBody, 4);
  Buffer.from("MV930G-G-SYNTHETIC", "ascii").copy(registrationBody, 9);
  Buffer.from("UNIT001", "ascii").copy(registrationBody, 29);
  registrationBody[36] = 1;
  Buffer.from("CAR", "ascii").copy(registrationBody, 37);
  const registration = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0100,
    terminalId: syntheticTerminalId,
    serialNumber: 31,
    body: registrationBody
  }));
  assert.equal(registration.packetType, "terminal_registration");
  assert.equal(registration.registration?.terminalModel, "MV930G-G-SYNTHETIC");

  const authentication = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0102,
    terminalId: syntheticTerminalId,
    serialNumber: 32,
    body: Buffer.from("synthetic-auth", "ascii")
  }));
  assert.equal(authentication.packetType, "terminal_authentication");
  assert.ok(authentication.authenticationCode);

  const logout = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0003,
    terminalId: syntheticTerminalId,
    serialNumber: 33
  }));
  assert.equal(logout.packetType, "terminal_logout");

  const terminalResponseBody = Buffer.alloc(5);
  terminalResponseBody.writeUInt16BE(30, 0);
  terminalResponseBody.writeUInt16BE(0x8001, 2);
  const terminalResponse = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0001,
    terminalId: syntheticTerminalId,
    serialNumber: 34,
    body: terminalResponseBody
  }));
  assert.equal(terminalResponse.packetType, "terminal_response");

  const transparent = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0900,
    terminalId: syntheticTerminalId,
    serialNumber: 35,
    body: Buffer.from([0xff, 1, 2, 3])
  }));
  assert.equal(transparent.packetType, "transparent_uplink");
  assert.deepEqual(transparent.transparent, { type: 0xff, payloadLength: 3 });
});

test("0x8001共通応答と0x8100登録応答は受信serial・端末ID・checksumを反映する", () => {
  const heartbeatRequest = buildJt808Frame({
    messageId: 0x0002,
    terminalId: syntheticTerminalId,
    serialNumber: 9
  });
  const commonFrame = buildJt808CommonResponse({
    terminalId: syntheticTerminalId,
    serialNumber: 10,
    replySerialNumber: 9,
    replyMessageId: 0x0002,
    result: 0
  });
  const common = parseJt808Frame(commonFrame) as Record<string, unknown>;
  assert.equal(common.messageId, 0x8001);
  assert.equal(common.terminalId, syntheticTerminalId);
  assert.equal(common.serialNumber, 10);
  assert.deepEqual([...(common.body as Buffer)], [0, 9, 0, 2, 0]);
  assert.equal(validateIngestAck(commonFrame, heartbeatRequest), true);

  const registration = parseJt808Frame(buildJt808RegistrationResponse({
    terminalId: syntheticTerminalId,
    serialNumber: 12,
    replySerialNumber: 11,
    result: 0,
    authenticationCode: "synthetic-auth"
  })) as Record<string, unknown>;
  assert.equal(registration.messageId, 0x8100);
  assert.equal(registration.terminalId, syntheticTerminalId);
  assert.equal((registration.body as Buffer).readUInt16BE(0), 11);
  assert.equal((registration.body as Buffer)[2], 0);

  const forbiddenDownlink = buildJt808Frame({
    messageId: 0x7777,
    terminalId: syntheticTerminalId,
    serialNumber: 13,
  });
  assert.throws(() => validateIngestAck(forbiddenDownlink, heartbeatRequest), /ingest_ack_invalid/);
});

test("TCPストリームは分割、連結、先頭noiseを安全に処理する", () => {
  const first = buildJt808Frame({ messageId: 0x0002, terminalId: syntheticTerminalId, serialNumber: 1 });
  const second = buildJt808Frame({ messageId: 0x0003, terminalId: syntheticTerminalId, serialNumber: 2 });
  const stream = new Jt808FrameStream();
  const splitAt = Math.floor(first.length / 2);
  assert.equal(stream.push(first.subarray(0, splitAt)).frames.length, 0);
  const completed = stream.push(Buffer.concat([first.subarray(splitAt), second]));
  assert.equal(completed.frames.length, 2);
  assert.equal(parseJt808Frame(completed.frames[0]).messageId, 0x0002);
  assert.equal(parseJt808Frame(completed.frames[1]).messageId, 0x0003);

  const noisy = new Jt808FrameStream();
  const result = noisy.push(Buffer.concat([Buffer.from([1, 2, 3]), first]));
  assert.equal(result.frames.length, 1);
  assert.ok(result.errors.some((error) => error.code === "leading_noise_discarded"));
});

test("7D 01と7D 02を復元し、応答生成時にもescapeする", () => {
  const transparent = buildJt808Frame({
    messageId: 0x0900,
    terminalId: syntheticTerminalId,
    serialNumber: 3,
    body: Buffer.from([0xff, 0x7d, 0x7e])
  });
  assert.ok(transparent.includes(Buffer.from([0x7d, 0x01])));
  assert.ok(transparent.includes(Buffer.from([0x7d, 0x02])));
  const parsed = parseJt808Frame(transparent) as Record<string, unknown>;
  assert.deepEqual([...(parsed.body as Buffer)], [0xff, 0x7d, 0x7e]);
});

test("checksum不正、本文長不一致、未対応message、最大frame超過を拒否する", () => {
  const heartbeat = buildJt808Frame({ messageId: 0x0002, terminalId: syntheticTerminalId, serialNumber: 4 });
  const corrupted = Buffer.from(heartbeat);
  corrupted[corrupted.length - 2] ^= 0xff;
  assertProtocolError(() => parseJt808Frame(corrupted), "checksum_mismatch");
  assertProtocolError(() => parseJt808Frame(withIncorrectBodyLength(heartbeat)), "body_length_mismatch");

  const unsupported = parseJt808Frame(buildJt808Frame({
    messageId: 0x7777,
    terminalId: syntheticTerminalId,
    serialNumber: 5
  }));
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.unsupportedReason, "unsupported_message_id");

  const bounded = new Jt808FrameStream({ maximumFrameBytes: 32, maximumBufferBytes: 64 });
  const oversized = bounded.push(Buffer.concat([Buffer.from([0x7e]), Buffer.alloc(40, 1), Buffer.from([0x7e])]));
  assert.equal(oversized.frames.length, 0);
  assert.ok(oversized.errors.some((error) => error.code === "frame_too_large"));
});

test("HMACは正常署名だけを許可し、同じnonceの再利用を拒否する", async () => {
  const secret = "s".repeat(32);
  const now = 1_800_000_000_000;
  const body = JSON.stringify({ version: 1, transport: "tcp", frameBase64: "fg==" });
  const headers = new Headers(createSignedIngestRequest({
    body,
    secret,
    now,
    nonce: "n".repeat(24)
  }));
  const verified = verifyGpsIngestSignature({ body, headers, secret, now });
  assert.equal(verified.ok, true);

  const tampered = new Headers(headers);
  tampered.set(INGEST_SIGNATURE_HEADER, "0".repeat(64));
  assert.deepEqual(verifyGpsIngestSignature({ body, headers: tampered, secret, now }), {
    ok: false,
    reason: "signature_invalid"
  });

  let nonceAlreadyUsed = false;
  const fakeClient = {
    async rpc(functionName: string, parameters: { p_nonce_hash: string }) {
      assert.equal(functionName, "mv930g_reserve_ingest_nonce");
      assert.deepEqual(parameters, { p_nonce_hash: verified.ok ? verified.nonceHash : "" });
      if (nonceAlreadyUsed) return { data: false, error: null };
      nonceAlreadyUsed = true;
      return { data: true, error: null };
    }
  };
  assert.equal(verified.ok, true);
  if (!verified.ok) return;
  assert.equal(await reserveGpsIngestNonce(fakeClient, verified.nonceHash), "accepted");
  assert.equal(await reserveGpsIngestNonce(fakeClient, verified.nonceHash), "replayed");
  assert.equal(
    await reserveGpsIngestNonce({
      async rpc() {
        return { data: null, error: { code: "database_unavailable" } };
      }
    }, verified.nonceHash),
    "unavailable"
  );
  assert.equal(
    await reserveGpsIngestNonce({
      async rpc() {
        return { data: null, error: null };
      }
    }, verified.nonceHash),
    "unavailable"
  );
});

test("管理画面用のprotocol terminal IDはsuffixだけをマスク表示する", () => {
  const masked = maskGpsIdentifier(syntheticTerminalId);
  assert.notEqual(masked, syntheticTerminalId);
  assert.ok(masked.endsWith(syntheticTerminalId.slice(-4)));
  assert.ok(masked.startsWith("•"));
});

test("通常TCP receiverはTLSなしで起動し、機密値をlogへ出さず権限制限spoolを使う", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "mv930g-receiver-test-"));
  const logs: string[] = [];
  let receiver: Awaited<ReturnType<typeof startMv930gReceiver>> | null = null;
  try {
    receiver = await startMv930gReceiver({
      host: "127.0.0.1",
      port: 0,
      healthHost: "127.0.0.1",
      healthPort: 0,
      spoolDirectory: temporaryDirectory,
      ingestEndpoint: "https://ingest.example.test/api/gps/ingest",
      ingestSecret: "s".repeat(32),
      logger: (event: string, code: string) => logs.push(JSON.stringify({ event, code })),
      forward: async () => ({
        ack: null,
        bindConnection: true,
        connectionAuthenticated: false,
        closeConnection: true
      })
    });
    assert.ok(receiver.server instanceof net.Server);
    const healthAddress = receiver.healthServer.address();
    assert.ok(healthAddress && typeof healthAddress === "object");
    const healthResponse = await fetch(`http://127.0.0.1:${healthAddress.port}/healthz`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), {
      status: "ok",
      transport: "plain-tcp",
      activeConnections: 0
    });
    const address = receiver.server.address();
    assert.ok(address && typeof address === "object");
    const frame = buildJt808Frame({ messageId: 0x0002, terminalId: syntheticTerminalId, serialNumber: 20 });
    await sendTcpFrame(address.port, frame);
    assert.equal((await stat(temporaryDirectory)).mode & 0o777, 0o700);
    assert.deepEqual(await readdir(temporaryDirectory), []);
    const output = logs.join("\n");
    assert.doesNotMatch(output, new RegExp(syntheticTerminalId));
    assert.doesNotMatch(output, new RegExp(frame.toString("hex")));
    assert.doesNotMatch(output, new RegExp(frame.toString("base64")));
  } finally {
    if (receiver) await receiver.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("HTTPS転送失敗時はACKせず接続を閉じ、0600 spoolを保持する", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "mv930g-forward-failure-test-"));
  const logs: string[] = [];
  let receiver: Awaited<ReturnType<typeof startMv930gReceiver>> | null = null;
  try {
    receiver = await startMv930gReceiver({
      host: "127.0.0.1",
      port: 0,
      healthHost: "127.0.0.1",
      healthPort: 0,
      spoolDirectory: temporaryDirectory,
      ingestEndpoint: "https://ingest.example.test/api/gps/ingest",
      ingestSecret: "s".repeat(32),
      logger: (event: string, code: string) => logs.push(JSON.stringify({ event, code })),
      forward: async () => {
        throw new Error("synthetic_forward_failure");
      }
    });
    const address = receiver.server.address();
    assert.ok(address && typeof address === "object");
    const frame = buildJt808Frame({ messageId: 0x0002, terminalId: syntheticTerminalId, serialNumber: 44 });
    await sendTcpFrame(address.port, frame);
    const retainedFiles = await readdir(temporaryDirectory);
    assert.equal(retainedFiles.length, 1);
    assert.equal((await stat(path.join(temporaryDirectory, retainedFiles[0]))).mode & 0o777, 0o600);
    const output = logs.join("\n");
    assert.match(output, /forward_failed/);
    assert.doesNotMatch(output, new RegExp(syntheticTerminalId));
    assert.doesNotMatch(output, new RegExp(frame.toString("base64")));
  } finally {
    if (receiver) await receiver.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("spoolは0600を維持し、容量またはファイル上限でfail-closedになる", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "mv930g-spool-limit-test-"));
  try {
    const spool = new PermissionRestrictedSpool(temporaryDirectory, { maximumBytes: 32, maximumFiles: 1 });
    await spool.initialize();
    const file = await spool.write({ value: "synthetic" });
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    await assert.rejects(() => spool.write({ value: "second" }), SpoolCapacityError);
    await spool.remove(file);
    const replacement = await spool.write({ value: "replacement" });
    assert.equal((await stat(replacement)).mode & 0o777, 0o600);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("認証済み端末は再接続しても端末ID単位のレート上限で拒否される", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "mv930g-terminal-rate-test-"));
  const logs: string[] = [];
  let forwardedFrames = 0;
  let receiver: Awaited<ReturnType<typeof startMv930gReceiver>> | null = null;
  try {
    receiver = await startMv930gReceiver({
      host: "127.0.0.1",
      port: 0,
      healthHost: "127.0.0.1",
      healthPort: 0,
      spoolDirectory: temporaryDirectory,
      ingestEndpoint: "https://ingest.example.test/api/gps/ingest",
      ingestSecret: "s".repeat(32),
      maximumFramesPerConnectionPerMinute: 10,
      maximumFramesPerIpPerMinute: 10,
      maximumFramesPerTerminalPerMinute: 1,
      logger: (event: string, code: string) => logs.push(JSON.stringify({ event, code })),
      forward: async () => {
        forwardedFrames += 1;
        return {
          ack: null,
          bindConnection: true,
          connectionAuthenticated: true,
          closeConnection: forwardedFrames === 1
        };
      }
    });
    const address = receiver.server.address();
    assert.ok(address && typeof address === "object");
    const frames = [40, 41].map((serialNumber) => buildJt808Frame({
      messageId: 0x0002,
      terminalId: syntheticTerminalId,
      serialNumber
    }));
    await sendTcpFramesAndWaitForClose(address.port, frames.slice(0, 1));
    await sendTcpFramesAndWaitForClose(address.port, frames.slice(1));
    assert.equal(forwardedFrames, 1);
    assert.match(logs.join("\n"), /terminal_frame_rate_limit/);
    assert.doesNotMatch(logs.join("\n"), new RegExp(syntheticTerminalId));
    assert.deepEqual(await readdir(temporaryDirectory), []);
  } finally {
    if (receiver) await receiver.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("raw-first、未登録端末拒否、再送位置重複防止、service-role分離を実装上固定する", async () => {
  const ingest = await readFile(path.join(repositoryRoot, "lib/gps/ingest.ts"), "utf8");
  const ingestSecurity = await readFile(path.join(repositoryRoot, "lib/gps/ingest-security.ts"), "utf8");
  const migration = await readFile(
    path.join(repositoryRoot, "supabase/migrations/202608060001_add_mv930g_jt808_ingest.sql"),
    "utf8"
  );
  const nonceRpcMigration = await readFile(
    path.join(repositoryRoot, "supabase/migrations/202608070002_reserve_gps_ingest_nonce_rpc.sql"),
    "utf8"
  );
  const receiver = await readFile(path.join(repositoryRoot, "server/mv930g/tcp-server.mjs"), "utf8");
  const commandPolicy = await readFile(path.join(repositoryRoot, "lib/gps/command-policy.ts"), "utf8");
  assert.ok(ingest.indexOf("insertPendingRawLog") < ingest.indexOf("parseMv930gPacket(input.raw)"));
  assert.match(ingest, /\.eq\("protocol_terminal_id", protocolTerminalId\)[\s\S]*\.eq\("is_active", true\)/);
  assert.match(ingest, /"unregistered_terminal"/);
  assert.match(ingest, /source_frame_fingerprint/);
  assert.doesNotMatch(ingest, /\.eq\("imei",/);
  assert.match(migration, /unique index gps_positions_source_frame_fingerprint_unique/);
  assert.match(migration, /unique \(protocol_terminal_id\)/);
  assert.match(migration, /gps_ingest_nonces/);
  assert.match(ingestSecurity, /\.rpc\("mv930g_reserve_ingest_nonce"/);
  assert.doesNotMatch(ingestSecurity, /\.from\("gps_ingest_nonces"\)/);
  assert.match(nonceRpcMigration, /security\s+definer/i);
  assert.match(nonceRpcMigration, /grant\s+execute[\s\S]*to\s+service_role/i);
  assert.doesNotMatch(nonceRpcMigration, /grant\s+(?:select|insert|update|delete)[\s\S]*gps_ingest_nonces/i);
  assert.doesNotMatch(receiver, /SUPABASE_SERVICE_ROLE_KEY|createClient\(/);
  assert.match(commandPolicy, /GPS_COMMAND_ALLOWLIST[^=]*= Object\.freeze\(\[\]\)/);
  for (const forbidden of ["RELAY,1#", "RELAY,2#", "0x8500", "APN,sensor.net#", "SERVER,0,"]) {
    assert.doesNotMatch(receiver, new RegExp(escapeRegExp(forbidden), "i"));
  }

  const one = buildJt808Frame({ messageId: 0x0200, terminalId: syntheticTerminalId, serialNumber: 30, body: createLocationBody() });
  const two = Buffer.from(one);
  assert.equal(frameFingerprint(one), frameFingerprint(two));
});

test("公開receiverのsystemd・上限・spool・ログ設定を安全値へ固定する", async () => {
  const environmentExample = await readFile(
    path.join(repositoryRoot, "deploy/mv930g/mv930g.env.example"),
    "utf8"
  );
  const service = await readFile(
    path.join(repositoryRoot, "deploy/mv930g/mv930g-tcp.service"),
    "utf8"
  );
  const journal = await readFile(
    path.join(repositoryRoot, "deploy/mv930g/90-mv930g-journald.conf"),
    "utf8"
  );
  assert.match(environmentExample, /^MV930G_IDLE_TIMEOUT_MS=300000$/m);
  assert.match(environmentExample, /^MV930G_MAX_CONNECTIONS=10$/m);
  assert.match(environmentExample, /^MV930G_MAX_FRAMES_PER_TERMINAL_PER_MINUTE=30$/m);
  assert.match(environmentExample, /^MV930G_SPOOL_MAX_BYTES=67108864$/m);
  assert.match(environmentExample, /^MV930G_SPOOL_MAX_FILES=10000$/m);
  assert.doesNotMatch(environmentExample, /SUPABASE|SERVICE_ROLE/);
  assert.match(service, /^DynamicUser=yes$/m);
  assert.match(service, /^Restart=on-failure$/m);
  assert.match(service, /^StateDirectoryMode=0700$/m);
  assert.match(service, /^RestrictAddressFamilies=AF_INET$/m);
  assert.doesNotMatch(service, /AF_INET6/);
  assert.match(journal, /^SystemMaxUse=64M$/m);
  assert.match(journal, /^MaxRetentionSec=7day$/m);
});

function createLocationBody() {
  const body = Buffer.alloc(28);
  body.writeUInt32BE(0, 0);
  body.writeUInt32BE(0x0f, 4);
  body.writeUInt32BE(12_345_678, 8);
  body.writeUInt32BE(98_765_432, 12);
  body.writeUInt16BE(123, 16);
  body.writeUInt16BE(456, 18);
  body.writeUInt16BE(270, 20);
  encodeBcd("260806120000").copy(body, 22);
  const additional = [
    item(0x01, uint32(12_345)),
    item(0x30, Buffer.from([20])),
    item(0x31, Buffer.from([9])),
    item(0x32, Buffer.from([6])),
    item(0x33, Buffer.from([2])),
    item(0x34, Buffer.from([1])),
    item(0x82, uint16(135)),
    item(0x57, Buffer.from([0x01, 0x00, 0x00, 0x01, 0, 0, 0, 0])),
    item(0x9f, Buffer.from("999,99,abcd,1234ef,20", "ascii")),
    item(0xcc, Buffer.from("0".repeat(20), "ascii"))
  ];
  return Buffer.concat([body, ...additional]);
}

function item(id: number, value: Buffer) {
  return Buffer.concat([Buffer.from([id, value.length]), value]);
}

function uint16(value: number) {
  const output = Buffer.alloc(2);
  output.writeUInt16BE(value);
  return output;
}

function uint32(value: number) {
  const output = Buffer.alloc(4);
  output.writeUInt32BE(value);
  return output;
}

function encodeBcd(value: string) {
  const output = Buffer.alloc(value.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number(value[index * 2]) * 16 + Number(value[index * 2 + 1]);
  }
  return output;
}

function withIncorrectBodyLength(frame: Buffer) {
  const decoded = unescapeJt808Payload(frame.subarray(1, -1));
  const payload = Buffer.from(decoded.subarray(0, -1));
  payload.writeUInt16BE((payload.readUInt16BE(2) & 0xfc00) | 1, 2);
  const checksum = Buffer.from([calculateJt808Checksum(payload)]);
  return Buffer.concat([Buffer.from([0x7e]), escapeJt808Payload(Buffer.concat([payload, checksum])), Buffer.from([0x7e])]);
}

function assertProtocolError(operation: () => unknown, code: string) {
  assert.throws(operation, (error) => error instanceof Jt808ProtocolError && error.code === code);
}

function sendTcpFrame(port: number, frame: Buffer) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => socket.write(frame));
    const timeout = setTimeout(() => socket.destroy(new Error("TCP test timeout.")), 3_000);
    socket.on("error", reject);
    socket.on("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function sendTcpFramesAndWaitForClose(port: number, frames: Buffer[]) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => socket.write(Buffer.concat(frames)));
    const timeout = setTimeout(() => socket.destroy(new Error("TCP rate-limit test timeout.")), 3_000);
    socket.on("error", reject);
    socket.on("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
