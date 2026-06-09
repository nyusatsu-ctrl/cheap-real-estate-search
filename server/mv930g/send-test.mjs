import net from "node:net";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const host = process.env.MV930G_TEST_HOST ?? "127.0.0.1";
const port = Number(process.env.MV930G_TCP_PORT ?? 9300);
const sampleHex =
  process.argv[2] ??
  "7e0200001c0139123456780001000000000000000102008bb807c5c5a40000003e005a26060912000000";

const socket = net.createConnection({ host, port }, () => {
  socket.write(Buffer.from(sampleHex.replace(/[^0-9a-f]/gi, ""), "hex"));
});

socket.on("data", (data) => {
  console.log(`[mv930g-test] response=${data.toString("hex")}`);
  socket.end();
});

socket.on("error", (error) => {
  console.error(`[mv930g-test] ${error.message}`);
  process.exit(1);
});

socket.on("close", () => {
  console.log(`[mv930g-test] sent ${sampleHex}`);
});
