import {
  sampleGpsCustomers,
  sampleGpsDevices,
  sampleGpsPositions,
  sampleGpsVehicles,
  sampleOperationLogs,
  sampleRawDeviceLogs
} from "@/lib/gps/sample-data";
import {
  validateGpsCustomerInput,
  validateGpsDeviceInput,
  validateGpsVehicleInput
} from "@/lib/gps/validation";

export type GpsResourceName =
  | "gps_customers"
  | "gps_vehicles"
  | "gps_devices"
  | "gps_positions"
  | "raw_device_logs"
  | "operation_logs";

export type GpsResourceConfig = {
  table: GpsResourceName;
  label: string;
  orderColumn: string;
  selectColumns: string;
  allowedFields: string[];
  sampleRows: Record<string, unknown>[];
};

export const GPS_RESOURCE_CONFIGS: Record<GpsResourceName, GpsResourceConfig> = {
  gps_customers: {
    table: "gps_customers",
    label: "GPS顧客",
    orderColumn: "updated_at",
    selectColumns: "*",
    allowedFields: ["full_name", "phone", "address", "email", "contract_type", "contract_status", "notes"],
    sampleRows: sampleGpsCustomers as unknown as Record<string, unknown>[]
  },
  gps_vehicles: {
    table: "gps_vehicles",
    label: "GPS車両",
    orderColumn: "updated_at",
    selectColumns: "*",
    allowedFields: ["customer_id", "vehicle_type", "maker", "model_name", "model_year", "vin", "license_plate", "status"],
    sampleRows: sampleGpsVehicles as unknown as Record<string, unknown>[]
  },
  gps_devices: {
    table: "gps_devices",
    label: "GPS端末",
    orderColumn: "updated_at",
    selectColumns: [
      "id",
      "vehicle_id",
      "device_name",
      "imei",
      "device_identifier",
      "protocol_terminal_id",
      "is_active",
      "sim_phone_number",
      "iccid",
      "connection_status",
      "last_seen_at",
      "jt808_auth_issued_at",
      "jt808_registered_at",
      "last_authenticated_at",
      "last_raw_log_id",
      "created_at",
      "updated_at"
    ].join(","),
    allowedFields: [
      "vehicle_id",
      "device_name",
      "imei",
      "device_identifier",
      "sim_phone_number",
      "iccid",
      "connection_status",
      "last_seen_at",
      "last_raw_log_id"
    ],
    sampleRows: sampleGpsDevices as unknown as Record<string, unknown>[]
  },
  gps_positions: {
    table: "gps_positions",
    label: "GPS位置",
    orderColumn: "received_at",
    selectColumns: "*",
    allowedFields: [
      "device_id",
      "vehicle_id",
      "raw_log_id",
      "latitude",
      "longitude",
      "speed_kmh",
      "heading_degrees",
      "acc_status",
      "relay_status",
      "vehicle_voltage",
      "located_at",
      "received_at"
    ],
    sampleRows: sampleGpsPositions as unknown as Record<string, unknown>[]
  },
  raw_device_logs: {
    table: "raw_device_logs",
    label: "raw受信ログ",
    orderColumn: "received_at",
    selectColumns: "*",
    allowedFields: [
      "transport",
      "remote_address",
      "remote_port",
      "local_port",
      "device_identifier",
      "imei",
      "packet_type",
      "raw_hex",
      "raw_text",
      "parsed_payload",
      "parse_status",
      "received_at"
    ],
    sampleRows: sampleRawDeviceLogs as unknown as Record<string, unknown>[]
  },
  operation_logs: {
    table: "operation_logs",
    label: "操作ログ",
    orderColumn: "created_at",
    selectColumns: "*",
    allowedFields: [
      "actor_profile_id",
      "device_id",
      "vehicle_id",
      "operation_type",
      "confirmation_text",
      "reason",
      "request_payload",
      "result_status",
      "result_message",
      "executed_at"
    ],
    sampleRows: sampleOperationLogs as unknown as Record<string, unknown>[]
  }
};

export function resolveGpsResource(resource: string) {
  const normalized = resource.replace(/-/g, "_");
  return GPS_RESOURCE_CONFIGS[normalized as GpsResourceName] ?? null;
}

export function sanitizeGpsPayload(config: GpsResourceConfig, payload: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {};
  for (const field of config.allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) sanitized[field] = payload[field];
  }
  return sanitized;
}

export function validateGpsMutableResourcePayload(config: GpsResourceConfig, payload: Record<string, unknown>) {
  if (config.table === "gps_customers") return validateGpsCustomerInput(payload);
  if (config.table === "gps_vehicles") return validateGpsVehicleInput(payload);
  if (config.table === "gps_devices") return validateGpsDeviceInput(payload);
  return null;
}

export function getGpsDeactivationPayload(config: GpsResourceConfig) {
  const updatedAt = new Date().toISOString();
  if (config.table === "gps_customers") return { contract_status: "cancelled", updated_at: updatedAt };
  if (config.table === "gps_vehicles") return { status: "inactive", updated_at: updatedAt };
  if (config.table === "gps_devices") return { connection_status: "offline", is_active: false, updated_at: updatedAt };
  return null;
}
