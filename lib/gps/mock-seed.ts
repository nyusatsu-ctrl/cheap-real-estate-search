import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GPS_MOCK_IDS,
  MV930G_SAMPLE_LOCATION_HEX,
  sampleGpsCustomers,
  sampleGpsDevices,
  sampleGpsPositions,
  sampleGpsVehicles,
  sampleOperationLogs
} from "@/lib/gps/sample-data";
import { parseMv930gPacket } from "@/lib/gps/parser";

export async function seedGpsMockData(supabase: SupabaseClient, actorProfileId: string | null) {
  const customer = sampleGpsCustomers[0];
  const vehicle = sampleGpsVehicles[0];
  const device = sampleGpsDevices[0];
  const position = sampleGpsPositions[0];
  const operation = sampleOperationLogs[0];
  const parsed = parseMv930gPacket(MV930G_SAMPLE_LOCATION_HEX);

  await supabase.from("gps_customers").upsert(customer, { onConflict: "id" });
  await supabase.from("gps_vehicles").upsert(vehicle, { onConflict: "id" });

  const { data: rawLog, error: rawError } = await supabase
    .from("raw_device_logs")
    .upsert(
      {
        id: GPS_MOCK_IDS.rawLog,
        transport: "tcp",
        remote_address: "127.0.0.1",
        remote_port: 50102,
        local_port: 9300,
        device_identifier: parsed.deviceIdentifier,
        imei: parsed.imei,
        packet_type: parsed.packetType,
        raw_hex: MV930G_SAMPLE_LOCATION_HEX,
        raw_text: null,
        parsed_payload: parsed.payload,
        parse_status: parsed.packetType === "unknown" ? "unsupported" : "parsed",
        received_at: position.received_at
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (rawError) throw new Error(rawError.message);

  await supabase.from("gps_devices").upsert({ ...device, last_raw_log_id: rawLog.id }, { onConflict: "id" });
  await supabase.from("gps_positions").upsert(position, { onConflict: "id" });
  await supabase.from("operation_logs").upsert(
    {
      ...operation,
      actor_profile_id: actorProfileId,
      confirmation_text:
        "燃料カットはMVP初期状態では実行不可。将来はRELAY,2#相当の安全カットを基本にする前提で確認ダイアログを必須にする。"
    },
    { onConflict: "id" }
  );

  return {
    customer_id: customer.id,
    vehicle_id: vehicle.id,
    device_id: device.id,
    position_id: position.id,
    raw_log_id: rawLog.id as string,
    operation_log_id: operation.id
  };
}
