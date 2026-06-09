import { GpsMockSeedButton } from "@/components/gps/GpsMockSeedButton";
import { MV930G_SAMPLE_AUTH_HEX, MV930G_SAMPLE_HEARTBEAT_HEX, MV930G_SAMPLE_LOCATION_HEX } from "@/lib/gps/sample-data";
import { parseMv930gPacket } from "@/lib/gps/parser";

const samples = [
  { label: "Terminal Authentication 0x0102", hex: MV930G_SAMPLE_AUTH_HEX },
  { label: "Heartbeat 0x0002", hex: MV930G_SAMPLE_HEARTBEAT_HEX },
  { label: "Location Information Report 0x0200", hex: MV930G_SAMPLE_LOCATION_HEX }
];

export default function GpsMockPage() {
  return (
    <div className="space-y-5">
      <GpsMockSeedButton />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">MV930Gサンプルhex</h2>
        <div className="mt-3 space-y-3">
          {samples.map((sample) => {
            const parsed = parseMv930gPacket(sample.hex);
            return (
              <div key={sample.label} className="rounded border border-slate-200 p-3">
                <p className="font-bold text-slate-950">{sample.label}</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">{sample.hex}</p>
                <p className="mt-2 text-sm text-slate-700">
                  message_id: <span className="font-bold">{parsed.messageId}</span> / device_id:{" "}
                  <span className="font-bold">{parsed.deviceIdentifier ?? "-"}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
