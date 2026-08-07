import http from "node:http";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Jt808FrameStream } from "./frame-stream.mjs";
import { forwardIngest } from "./ingest-client.mjs";
import { parseJt808Frame } from "./parser.mjs";
import { PermissionRestrictedSpool } from "./spool.mjs";

const DEFAULT_IDLE_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_MAX_CONNECTIONS_PER_IP = 10;
const DEFAULT_MAX_FRAMES_PER_MINUTE = 30;
const DEFAULT_MAX_FRAMES_PER_IP_PER_MINUTE = 300;
const DEFAULT_SPOOL_MAXIMUM_BYTES = 64 * 1024 * 1024;
const DEFAULT_SPOOL_MAXIMUM_FILES = 10_000;

export async function startMv930gReceiver(options = {}) {
  const settings = normalizeOptions(options);
  await settings.spool.initialize();
  const connectionsByIp = new Map();
  const ipRateLimiter = new FixedWindowRateLimiter(settings.maximumFramesPerIpPerMinute);
  const terminalRateLimiter = new FixedWindowRateLimiter(settings.maximumFramesPerTerminalPerMinute);
  let activeConnections = 0;

  const server = net.createServer({ allowHalfOpen: false }, (socket) => {
    const remoteKey = normalizeRemoteKey(socket.remoteAddress);
    const ipConnections = connectionsByIp.get(remoteKey) ?? 0;
    if (activeConnections >= settings.maximumConnections || ipConnections >= settings.maximumConnectionsPerIp) {
      settings.logger("connection_rejected", "connection_limit");
      socket.destroy();
      return;
    }

    activeConnections += 1;
    connectionsByIp.set(remoteKey, ipConnections + 1);
    const stream = new Jt808FrameStream();
    const connectionRateLimiter = new FixedWindowRateLimiter(settings.maximumFramesPerConnectionPerMinute);
    let connectionTerminalId = null;
    let connectionAuthenticated = false;
    let processing = Promise.resolve();
    let finalized = false;

    socket.setTimeout(settings.idleTimeoutMs);
    socket.setNoDelay(true);
    socket.on("data", (chunk) => {
      const extracted = stream.push(chunk);
      for (const error of extracted.errors) settings.logger("stream_rejected", error.code);
      if (extracted.errors.some((error) => error.code === "connection_buffer_overflow" || error.code === "frame_too_large")) {
        socket.destroy();
        return;
      }

      processing = processing.then(async () => {
        for (const frame of extracted.frames) {
          if (socket.destroyed) break;
          if (!connectionRateLimiter.consume("connection") || !ipRateLimiter.consume(remoteKey)) {
            settings.logger("connection_rejected", "frame_rate_limit");
            socket.destroy();
            break;
          }

          let parsedTerminalId = null;
          try {
            parsedTerminalId = parseJt808Frame(frame).terminalId;
          } catch {
            // The application endpoint persists and classifies invalid frames.
          }

          const terminalHasActiveLimit = parsedTerminalId
            ? terminalRateLimiter.hasActiveEntry(parsedTerminalId)
            : false;
          if (connectionAuthenticated) {
            if (!connectionTerminalId || parsedTerminalId !== connectionTerminalId) {
              settings.logger("connection_rejected", "authenticated_terminal_mismatch");
              socket.destroy();
              break;
            }
          }
          if ((connectionAuthenticated || terminalHasActiveLimit) && !terminalRateLimiter.consume(parsedTerminalId)) {
            settings.logger("connection_rejected", "terminal_frame_rate_limit");
            socket.destroy();
            break;
          }

          const payload = {
            version: 1,
            transport: "tcp",
            frameBase64: frame.toString("base64"),
            remoteAddress: socket.remoteAddress ?? null,
            remotePort: socket.remotePort ?? null,
            localPort: socket.localPort ?? settings.port,
            connectionTerminalId,
            connectionAuthenticated
          };
          const spoolFile = await settings.spool.write(payload);
          try {
            const result = await settings.forward(payload);
            await settings.spool.remove(spoolFile);
            if (result.bindConnection && parsedTerminalId) {
              if (connectionTerminalId && connectionTerminalId !== parsedTerminalId) {
                settings.logger("connection_rejected", "terminal_changed");
                socket.destroy();
                break;
              }
              connectionTerminalId = parsedTerminalId;
            }
            if (result.connectionAuthenticated && (!connectionTerminalId || !parsedTerminalId)) {
              settings.logger("connection_rejected", "authenticated_terminal_missing");
              socket.destroy();
              break;
            }
            if (result.connectionAuthenticated && !connectionAuthenticated && !terminalHasActiveLimit) {
              if (!terminalRateLimiter.consume(connectionTerminalId)) {
                settings.logger("connection_rejected", "terminal_frame_rate_limit");
                socket.destroy();
                break;
              }
            }
            connectionAuthenticated = result.connectionAuthenticated;
            if (result.ack && !socket.destroyed) socket.write(result.ack);
            if (result.closeConnection) {
              socket.end();
              break;
            }
          } catch (error) {
            settings.logger("forward_failed", safeErrorCode(error));
            socket.destroy();
            break;
          }
        }
      }).catch((error) => {
        settings.logger("receiver_failed", safeErrorCode(error));
        socket.destroy();
      });
    });

    socket.on("timeout", () => {
      settings.logger("connection_closed", "idle_timeout");
      socket.destroy();
    });
    socket.on("error", (error) => settings.logger("socket_error", safeErrorCode(error)));
    socket.on("close", () => {
      if (finalized) return;
      finalized = true;
      activeConnections -= 1;
      const remaining = (connectionsByIp.get(remoteKey) ?? 1) - 1;
      if (remaining > 0) connectionsByIp.set(remoteKey, remaining);
      else connectionsByIp.delete(remoteKey);
      stream.reset();
    });
  });
  server.maxConnections = settings.maximumConnections;
  server.on("error", (error) => settings.logger("tcp_server_error", safeErrorCode(error)));

  const healthServer = http.createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/healthz") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ status: "ok", transport: "plain-tcp", activeConnections }));
  });
  healthServer.on("error", (error) => settings.logger("health_server_error", safeErrorCode(error)));

  await Promise.all([
    listen(server, settings.port, settings.host),
    listen(healthServer, settings.healthPort, settings.healthHost)
  ]);
  settings.logger("receiver_started", "plain_tcp");
  return {
    server,
    healthServer,
    close: async () => Promise.all([closeServer(server), closeServer(healthServer)])
  };
}

function normalizeOptions(options) {
  const endpoint = options.ingestEndpoint ?? process.env.MV930G_INGEST_URL;
  const secret = options.ingestSecret ?? process.env.MV930G_INGEST_HMAC_SECRET;
  if (!endpoint || !secret) throw new Error("MV930G ingest endpoint and HMAC secret are required.");
  const spoolDirectory = options.spoolDirectory ?? process.env.MV930G_SPOOL_DIRECTORY;
  if (!spoolDirectory || !path.isAbsolute(spoolDirectory)) throw new Error("An absolute MV930G spool path is required.");
  return {
    host: options.host ?? process.env.MV930G_TCP_HOST ?? "127.0.0.1",
    port: integerSetting(options.port ?? process.env.MV930G_TCP_PORT, 9300, 0, 65535),
    healthHost: options.healthHost ?? process.env.MV930G_HEALTH_HOST ?? "127.0.0.1",
    healthPort: integerSetting(options.healthPort ?? process.env.MV930G_HEALTH_PORT, 9301, 0, 65535),
    idleTimeoutMs: integerSetting(options.idleTimeoutMs ?? process.env.MV930G_IDLE_TIMEOUT_MS, DEFAULT_IDLE_TIMEOUT_MS, 1_000, 600_000),
    maximumConnections: integerSetting(options.maximumConnections ?? process.env.MV930G_MAX_CONNECTIONS, DEFAULT_MAX_CONNECTIONS, 1, 10_000),
    maximumConnectionsPerIp: integerSetting(options.maximumConnectionsPerIp ?? process.env.MV930G_MAX_CONNECTIONS_PER_IP, DEFAULT_MAX_CONNECTIONS_PER_IP, 1, 1_000),
    maximumFramesPerConnectionPerMinute: integerSetting(options.maximumFramesPerConnectionPerMinute ?? process.env.MV930G_MAX_FRAMES_PER_CONNECTION_PER_MINUTE, DEFAULT_MAX_FRAMES_PER_MINUTE, 1, 10_000),
    maximumFramesPerIpPerMinute: integerSetting(options.maximumFramesPerIpPerMinute ?? process.env.MV930G_MAX_FRAMES_PER_IP_PER_MINUTE, DEFAULT_MAX_FRAMES_PER_IP_PER_MINUTE, 1, 100_000),
    maximumFramesPerTerminalPerMinute: integerSetting(options.maximumFramesPerTerminalPerMinute ?? process.env.MV930G_MAX_FRAMES_PER_TERMINAL_PER_MINUTE, DEFAULT_MAX_FRAMES_PER_MINUTE, 1, 10_000),
    spool: options.spool ?? new PermissionRestrictedSpool(spoolDirectory, {
      maximumBytes: integerSetting(options.spoolMaximumBytes ?? process.env.MV930G_SPOOL_MAX_BYTES, DEFAULT_SPOOL_MAXIMUM_BYTES, 1, 10 * 1024 * 1024 * 1024),
      maximumFiles: integerSetting(options.spoolMaximumFiles ?? process.env.MV930G_SPOOL_MAX_FILES, DEFAULT_SPOOL_MAXIMUM_FILES, 1, 1_000_000)
    }),
    logger: options.logger ?? safeLogger,
    forward: options.forward ?? ((payload) => forwardIngest(payload, {
      endpoint,
      secret,
      timeoutMs: integerSetting(process.env.MV930G_INGEST_TIMEOUT_MS, 10_000, 1_000, 60_000)
    }))
  };
}

class FixedWindowRateLimiter {
  constructor(limit, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.entries = new Map();
    this.consumptions = 0;
  }

  consume(key, now = Date.now()) {
    this.consumptions += 1;
    if (this.consumptions % 1_024 === 0) this.#removeExpired(now);
    const existing = this.entries.get(key);
    if (!existing || now - existing.startedAt >= this.windowMs) {
      this.entries.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (existing.count >= this.limit) return false;
    existing.count += 1;
    return true;
  }

  hasActiveEntry(key, now = Date.now()) {
    const existing = this.entries.get(key);
    return Boolean(existing && now - existing.startedAt < this.windowMs);
  }

  #removeExpired(now) {
    for (const [key, value] of this.entries) {
      if (now - value.startedAt >= this.windowMs) this.entries.delete(key);
    }
  }
}

function integerSetting(value, fallback, minimum, maximum) {
  const parsed = value == null || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error("Invalid MV930G numeric setting.");
  return parsed;
}

function normalizeRemoteKey(value) {
  return typeof value === "string" && value.length <= 64 ? value : "unknown";
}

function safeLogger(event, code) {
  console.log("[mv930g-receiver]", event, { code });
}

function safeErrorCode(error) {
  if (!error || typeof error !== "object") return "unknown";
  if ("code" in error && error.code) return String(error.code);
  if ("name" in error && error.name) return String(error.name);
  return "unknown";
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function runFromCommandLine() {
  if (process.env.MV930G_RECEIVER_ENABLED !== "true") {
    throw new Error("MV930G receiver is disabled until explicitly enabled.");
  }
  const receiver = await startMv930gReceiver();
  const shutdown = async () => {
    await receiver.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFromCommandLine().catch((error) => {
    safeLogger("startup_failed", safeErrorCode(error));
    process.exit(1);
  });
}
