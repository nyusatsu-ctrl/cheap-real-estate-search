import "server-only";
import { getAdminAuthState, requireAdmin } from "@/lib/admin";
import { sampleGpsAdminData } from "@/lib/gps/sample-data";
import { isGpsDemoModeEnabled } from "@/lib/gps/runtime";
import {
  createGpsAdminServiceRoleClient,
  GpsAdminClientConfigurationError
} from "@/lib/gps/server-admin-client";
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
  const state = await getAdminAuthState();
  if (state.status !== "authorized") return state;
  return {
    status: "authorized" as const,
    ...state.admin,
    isPreview: isGpsDemoModeEnabled()
  };
}

export async function loadGpsAdminData(): Promise<GpsAdminData> {
  await requireAdmin("/admin/gps");
  if (isGpsDemoModeEnabled()) return sampleGpsAdminData;

  let supabase;
  try {
    supabase = createGpsAdminServiceRoleClient();
  } catch (error) {
    if (error instanceof GpsAdminClientConfigurationError) {
      throw new GpsDataUnavailableError("configuration");
    }
    throw error;
  }

  try {
    const [
      customersResult,
      vehiclesResult,
      devicesResult,
      positionsResult,
      latestPositionsResult,
      rawLogsResult,
      parseErrorsResult,
      operationLogsResult,
      commandQueueResult
    ] = await Promise.all([
      supabase.from("gps_customers").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("gps_vehicles").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase
        .from("gps_devices")
        .select(
          "id,vehicle_id,device_name,imei,device_identifier,protocol_terminal_id,is_active,sim_phone_number,iccid,connection_status,last_seen_at,jt808_auth_issued_at,jt808_registered_at,last_authenticated_at,last_raw_log_id,created_at,updated_at"
        )
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase.from("gps_positions").select("*").order("received_at", { ascending: false }).limit(500),
      supabase.from("gps_latest_positions").select("*").order("received_at", { ascending: false }).limit(200),
      supabase.from("raw_device_logs").select("*").order("received_at", { ascending: false }).limit(500),
      supabase.from("protocol_parse_errors").select("*").order("created_at", { ascending: false }).limit(500),
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
      parseErrorsResult.error,
      operationLogsResult.error,
      commandQueueResult.error
    ].find(Boolean);

    if (firstError) {
      logGpsDataError("query_failed", firstError);
      throw new GpsDataUnavailableError("query");
    }

    return {
      customers: (customersResult.data ?? []) as GpsCustomer[],
      vehicles: (vehiclesResult.data ?? []) as GpsVehicle[],
      devices: (devicesResult.data ?? []) as GpsDevice[],
      positions: (positionsResult.data ?? []) as GpsPosition[],
      latestPositions: (latestPositionsResult.data ?? []) as GpsLatestPosition[],
      rawLogs: (rawLogsResult.data ?? []) as RawDeviceLog[],
      parseErrors: (parseErrorsResult.data ?? []) as GpsAdminData["parseErrors"],
      operationLogs: (operationLogsResult.data ?? []) as OperationLog[],
      commandQueue: (commandQueueResult.data ?? []) as DeviceCommand[],
      isDemo: false
    };
  } catch (error) {
    if (error instanceof GpsDataUnavailableError) throw error;
    logGpsDataError("unexpected_failure", error);
    throw new GpsDataUnavailableError("unexpected");
  }
}

export class GpsDataUnavailableError extends Error {
  constructor(public readonly reason: "configuration" | "query" | "unexpected") {
    super("GPS data is unavailable.");
    this.name = "GpsDataUnavailableError";
  }
}

function logGpsDataError(event: string, error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code || "unknown")
      : "unknown";
  console.error("[gps-data]", event, { code });
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
