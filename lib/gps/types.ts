export type GpsContractType = "car" | "bike";
export type GpsContractStatus = "screening" | "active" | "overdue" | "paid_off" | "cancelled";
export type GpsVehicleType = "car" | "bike";
export type GpsVehicleStatus = "active" | "sold" | "returned" | "inactive";
export type GpsConnectionStatus = "online" | "offline";
export type GpsPacketType = "terminal_authentication" | "heartbeat" | "location_report" | "unknown";
export type GpsParseStatus = "pending" | "parsed" | "failed" | "unsupported";
export type GpsAccStatus = "on" | "off" | "unknown";
export type GpsRelayStatus = "cut" | "restored" | "unknown";
export type GpsOperationType = "safe_cut" | "restore" | "arm" | "disarm";
export type GpsOperationStatus = "queued" | "sent" | "acknowledged" | "failed" | "cancelled";
export type GpsCommandStatus = "queued" | "sending" | "sent" | "acknowledged" | "failed" | "cancelled";

export type GpsCustomer = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  contract_type: GpsContractType;
  contract_status: GpsContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GpsVehicle = {
  id: string;
  customer_id: string | null;
  vehicle_type: GpsVehicleType;
  maker: string | null;
  model_name: string | null;
  model_year: number | null;
  vin: string | null;
  license_plate: string | null;
  status: GpsVehicleStatus;
  created_at: string;
  updated_at: string;
};

export type GpsDevice = {
  id: string;
  vehicle_id: string | null;
  device_name: string;
  imei: string;
  device_identifier: string;
  sim_phone_number: string | null;
  iccid: string | null;
  connection_status: GpsConnectionStatus;
  last_seen_at: string | null;
  last_raw_log_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GpsPosition = {
  id: string;
  device_id: string | null;
  vehicle_id: string | null;
  raw_log_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading_degrees: number | null;
  acc_status: GpsAccStatus;
  relay_status: GpsRelayStatus;
  vehicle_voltage: number | null;
  located_at: string | null;
  received_at: string;
  created_at: string;
};

export type RawDeviceLog = {
  id: string;
  transport: "tcp" | "udp";
  remote_address: string | null;
  remote_port: number | null;
  local_port: number | null;
  device_identifier: string | null;
  imei: string | null;
  packet_type: GpsPacketType;
  raw_hex: string;
  raw_text: string | null;
  parsed_payload: Record<string, unknown>;
  parse_status: GpsParseStatus;
  received_at: string;
  created_at: string;
};

export type OperationLog = {
  id: string;
  actor_profile_id: string | null;
  device_id: string | null;
  vehicle_id: string | null;
  operation_type: GpsOperationType;
  confirmation_text: string;
  reason: string;
  request_payload: Record<string, unknown>;
  result_status: GpsOperationStatus;
  result_message: string | null;
  created_at: string;
  executed_at: string | null;
};

export type DeviceCommand = {
  id: string;
  operation_log_id: string | null;
  device_id: string;
  command_type: GpsOperationType;
  command_payload: Record<string, unknown>;
  command_hex: string | null;
  status: GpsCommandStatus;
  attempts: number;
  last_error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GpsLatestPosition = GpsPosition & {
  device_name: string | null;
  imei: string | null;
  device_identifier: string | null;
  connection_status: GpsConnectionStatus | null;
  last_seen_at: string | null;
  vehicle_type: GpsVehicleType | null;
  maker: string | null;
  model_name: string | null;
  license_plate: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  contract_status: GpsContractStatus | null;
};

export type GpsAdminData = {
  customers: GpsCustomer[];
  vehicles: GpsVehicle[];
  devices: GpsDevice[];
  positions: GpsPosition[];
  latestPositions: GpsLatestPosition[];
  rawLogs: RawDeviceLog[];
  operationLogs: OperationLog[];
  commandQueue: DeviceCommand[];
  isDemo: boolean;
};

export type ParsedMv930gPacket = {
  packetType: GpsPacketType;
  messageId: "0102" | "0002" | "0200" | string;
  deviceIdentifier: string | null;
  imei: string | null;
  occurredAt: string | null;
  position: {
    latitude: number;
    longitude: number;
    speedKmh: number | null;
    headingDegrees: number | null;
    accStatus: GpsAccStatus;
    relayStatus: GpsRelayStatus;
    vehicleVoltage: number | null;
  } | null;
  payload: Record<string, unknown>;
};
