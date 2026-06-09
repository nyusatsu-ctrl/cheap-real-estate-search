import "server-only";
import { getCurrentAdmin } from "@/lib/admin";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { sampleGpsAdminData } from "@/lib/gps/sample-data";
import type {
  DeviceCommand,
  GpsAdminData,
  GpsCustomer,
  GpsDevice,
  GpsLatestPosition,
  GpsPosition,
  GpsVehicle,
  OperationLog,
  RawDeviceLog
} from "@/lib/gps/types";

export async function getGpsAdminOrPreview() {
  const admin = await getCurrentAdmin();
  if (admin) return { ...admin, isPreview: false };
  if (!hasSupabaseEnv()) return { id: "local-preview", email: "local-preview@example.com", isPreview: true };
  return null;
}

export async function loadGpsAdminData(): Promise<GpsAdminData> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return sampleGpsAdminData;

  try {
    const [
      customersResult,
      vehiclesResult,
      devicesResult,
      positionsResult,
      latestPositionsResult,
      rawLogsResult,
      operationLogsResult,
      commandQueueResult
    ] = await Promise.all([
      supabase.from("gps_customers").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("gps_vehicles").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("gps_devices").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("gps_positions").select("*").order("received_at", { ascending: false }).limit(500),
      supabase.from("gps_latest_positions").select("*").order("received_at", { ascending: false }).limit(200),
      supabase.from("raw_device_logs").select("*").order("received_at", { ascending: false }).limit(500),
      supabase.from("operation_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("device_command_queue").select("*").order("queued_at", { ascending: false }).limit(200)
    ]);

    const firstError = [
      customersResult.error,
      vehiclesResult.error,
      devicesResult.error,
      positionsResult.error,
      latestPositionsResult.error,
      rawLogsResult.error,
      operationLogsResult.error,
      commandQueueResult.error
    ].find(Boolean);

    if (firstError) return sampleGpsAdminData;

    return {
      customers: (customersResult.data ?? []) as GpsCustomer[],
      vehicles: (vehiclesResult.data ?? []) as GpsVehicle[],
      devices: (devicesResult.data ?? []) as GpsDevice[],
      positions: (positionsResult.data ?? []) as GpsPosition[],
      latestPositions: (latestPositionsResult.data ?? []) as GpsLatestPosition[],
      rawLogs: (rawLogsResult.data ?? []) as RawDeviceLog[],
      operationLogs: (operationLogsResult.data ?? []) as OperationLog[],
      commandQueue: (commandQueueResult.data ?? []) as DeviceCommand[],
      isDemo: false
    };
  } catch {
    return sampleGpsAdminData;
  }
}

export function findGpsCustomer(data: GpsAdminData, id: string) {
  return data.customers.find((customer) => customer.id === id) ?? null;
}

export function findGpsVehicle(data: GpsAdminData, id: string) {
  return data.vehicles.find((vehicle) => vehicle.id === id) ?? null;
}

export function findGpsDevice(data: GpsAdminData, id: string) {
  return data.devices.find((device) => device.id === id) ?? null;
}
