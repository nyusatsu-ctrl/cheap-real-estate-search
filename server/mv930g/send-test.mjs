import net from "node:net";
import { buildJt808Frame, parseJt808Frame } from "./parser.mjs";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const host = process.env.MV930G_TEST_HOST ?? "127.0.0.1";
const port = Number(process.env.MV930G_TCP_PORT ?? 9300);
if (host !== "127.0.0.1" && host !== "::1" && process.env.MV930G_ALLOW_REMOTE_TEST_SERVER !== "true") {
  throw new Error("The synthetic sender is restricted to a loopback receiver by default.");
}

const sample = buildJt808Frame({
  messageId: 0x0002,
  terminalId: "000000000001",
  serialNumber: 1
});
const socket = net.createConnection({ host, port }, () => socket.write(sample));
socket.setTimeout(5_000);

socket.on("data", (data) => {
  try {
    const response = parseJt808Frame(data);
    console.log("[mv930g-test] response_received", { messageId: response.messageIdHex });
  } catch {
    console.log("[mv930g-test] response_rejected", { code: "invalid_frame" });
  }
  socket.end();
});
socket.on("timeout", () => socket.destroy(new Error("Synthetic receiver test timed out.")));
socket.on("error", (error) => {
  console.error("[mv930g-test] failed", { code: String(error.code || error.name || "unknown") });
  process.exitCode = 1;
});
socket.on("close", () => console.log("[mv930g-test] synthetic_heartbeat_completed"));
