export type GpsContractType = "car" | "bike";
export type GpsContractStatus = "screening" | "active" | "overdue" | "paid_off" | "cancelled";
export type GpsVehicleType = "car" | "bike";
export type GpsVehicleStatus = "active" | "sold" | "returned" | "inactive";
export type GpsConnectionStatus = "online" | "offline";
export type GpsPacketType =
  | "terminal_response"
  | "heartbeat"
  | "terminal_logout"
  | "terminal_registration"
  | "terminal_authentication"
  | "location_report"
  | "transparent_uplink"
  | "unknown";
export type GpsParseStatus = "pending" | "parsed" | "failed" | "unsupported";
export type GpsAccStatus = "on" | "off" | "unknown";
export type GpsRelayStatus = "cut" | "restored" | "unknown";
export type GpsOperationType =
  | "safe_cut"
  | "restore"
  | "arm"
  | "disarm"
  | "customer_create"
  | "customer_update"
  | "customer_deactivate"
  | "vehicle_create"
  | "vehicle_update"
  | "vehicle_deactivate"
  | "device_create"
  | "device_update"
  | "device_deactivate";
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
  protocol_terminal_id: string | null;
  is_active: boolean;
  sim_phone_number: string | null;
  iccid: string | null;
  connection_status: GpsConnectionStatus;
  last_seen_at: string | null;
  jt808_auth_issued_at: string | null;
  jt808_registered_at: string | null;
  last_authenticated_at: string | null;
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
  source_frame_fingerprint: string | null;
  alarm_flags: number | null;
  status_flags: number | null;
  altitude_meters: number | null;
  positioning_status: "positioned" | "not_positioned" | null;
  terminal_time_raw: string | null;
  mileage_km: number | null;
  signal_strength: number | null;
  gnss_satellites: number | null;
  gps_satellites: number | null;
  beidou_satellites: number | null;
  glonass_satellites: number | null;
  additional_status: Record<string, unknown> | null;
  base_station_info: Record<string, unknown> | null;
  iccid: string | null;
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
  protocol_terminal_id: string | null;
  imei: string | null;
  message_id: string | null;
  message_serial: number | null;
  frame_fingerprint: string | null;
  duplicate_of_raw_log_id: string | null;
  checksum_valid: boolean | null;
  encryption_type: number | null;
  is_subpackage: boolean | null;
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

export type ProtocolParseError = {
  id: string;
  raw_log_id: string;
  parser_version: string | null;
  error_type: string;
  error_message: string;
  created_at: string;
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
  parseErrors: ProtocolParseError[];
  operationLogs: OperationLog[];
  commandQueue: DeviceCommand[];
  isDemo: boolean;
};

export type ParsedMv930gPacket = {
  packetType: GpsPacketType;
  messageId: string;
  messageSerialNumber: number;
  protocolTerminalId: string;
  deviceIdentifier: string | null;
  imei: string | null;
  occurredAt: string | null;
  checksumValid: boolean;
  encryptionType: number;
  isSubpackage: boolean;
  supported: boolean;
  unsupportedReason: string | null;
  position: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    speedKmh: number;
    headingDegrees: number;
    accStatus: GpsAccStatus;
    positioningStatus: "positioned" | "not_positioned";
    relayStatus: GpsRelayStatus;
    vehicleVoltage: number | null;
    alarmFlags: number;
    statusFlags: number;
    terminalTimeRaw: string;
    mileageKm: number | null;
    signalStrength: number | null;
    gnssSatellites: number | null;
    gpsSatellites: number | null;
    beidouSatellites: number | null;
    glonassSatellites: number | null;
    additionalStatus: Record<string, unknown> | null;
    baseStation: Record<string, unknown> | null;
    iccid: string | null;
  } | null;
  payload: Record<string, unknown>;
};
