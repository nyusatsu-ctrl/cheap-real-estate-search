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

export const GPS_MOCK_IDS = {
  customer: "00000000-0000-4000-8000-000000000101",
  vehicle: "00000000-0000-4000-8000-000000000201",
  device: "00000000-0000-4000-8000-000000000301",
  rawLog: "00000000-0000-4000-8000-000000000401",
  position: "00000000-0000-4000-8000-000000000501",
  operation: "00000000-0000-4000-8000-000000000601",
  command: "00000000-0000-4000-8000-000000000701"
};

export const MV930G_SAMPLE_LOCATION_HEX =
  "7e0200001c0139123456780001000000000000000102008bb807c5c5a40000003e005a26060912000000";
export const MV930G_SAMPLE_AUTH_HEX = "7e010200080139123456780001313233343536373800";
export const MV930G_SAMPLE_HEARTBEAT_HEX = "7e00020000013912345678000200";

const now = "2026-06-09T12:00:00.000Z";

export const sampleGpsCustomers: GpsCustomer[] = [
  {
    id: GPS_MOCK_IDS.customer,
    full_name: "山田 太郎",
    phone: "090-1234-5678",
    address: "福岡県福岡市中央区天神1-1-1",
    email: "taro.yamada@example.com",
    contract_type: "car",
    contract_status: "active",
    notes: "MV930G MVP確認用のモック顧客",
    created_at: now,
    updated_at: now
  }
];

export const sampleGpsVehicles: GpsVehicle[] = [
  {
    id: GPS_MOCK_IDS.vehicle,
    customer_id: GPS_MOCK_IDS.customer,
    vehicle_type: "car",
    maker: "トヨタ",
    model_name: "プリウス",
    model_year: 2018,
    vin: "ZVW50-MOCK-0001",
    license_plate: "福岡 300 あ 12-34",
    status: "active",
    created_at: now,
    updated_at: now
  }
];

export const sampleGpsDevices: GpsDevice[] = [
  {
    id: GPS_MOCK_IDS.device,
    vehicle_id: GPS_MOCK_IDS.vehicle,
    device_name: "MV930G-デモ管理対象",
    imei: "359339080000001",
    device_identifier: "13912345678",
    sim_phone_number: "080-0000-0001",
    iccid: "8981100000000000001",
    connection_status: "online",
    last_seen_at: now,
    last_raw_log_id: GPS_MOCK_IDS.rawLog,
    created_at: now,
    updated_at: now
  }
];

export const sampleGpsPositions: GpsPosition[] = [
  {
    id: GPS_MOCK_IDS.position,
    device_id: GPS_MOCK_IDS.device,
    vehicle_id: GPS_MOCK_IDS.vehicle,
    raw_log_id: GPS_MOCK_IDS.rawLog,
    latitude: 33.5902,
    longitude: 130.4017,
    speed_kmh: 6.2,
    heading_degrees: 90,
    acc_status: "on",
    relay_status: "restored",
    vehicle_voltage: 12.6,
    located_at: now,
    received_at: now,
    created_at: now
  }
];

export const sampleRawDeviceLogs: RawDeviceLog[] = [
  {
    id: GPS_MOCK_IDS.rawLog,
    transport: "tcp",
    remote_address: "127.0.0.1",
    remote_port: 50102,
    local_port: 9300,
    device_identifier: "13912345678",
    imei: null,
    packet_type: "location_report",
    raw_hex: MV930G_SAMPLE_LOCATION_HEX,
    raw_text: null,
    parsed_payload: {
      message_id: "0200",
      device_id: "13912345678",
      protocol_family: "mv930g_minimal_jt808"
    },
    parse_status: "parsed",
    received_at: now,
    created_at: now
  }
];

export const sampleOperationLogs: OperationLog[] = [
  {
    id: GPS_MOCK_IDS.operation,
    actor_profile_id: null,
    device_id: GPS_MOCK_IDS.device,
    vehicle_id: GPS_MOCK_IDS.vehicle,
    operation_type: "safe_cut",
    confirmation_text: "燃料カットは実機接続前のため送信不可。将来はRELAY,2#相当の安全カットを基本にする。",
    reason: "MVPテスト操作",
    request_payload: {
      mode: "mock",
      safety_note: "disabled_until_protocol_verified"
    },
    result_status: "cancelled",
    result_message: "実機未接続のため送信していません。",
    created_at: now,
    executed_at: null
  }
];

export const sampleDeviceCommandQueue: DeviceCommand[] = [
  {
    id: GPS_MOCK_IDS.command,
    operation_log_id: GPS_MOCK_IDS.operation,
    device_id: GPS_MOCK_IDS.device,
    command_type: "safe_cut",
    command_payload: {
      mode: "mock"
    },
    command_hex: null,
    status: "cancelled",
    attempts: 0,
    last_error_message: "MVPでは遠隔制御送信を無効化しています。",
    queued_at: now,
    sent_at: null,
    acknowledged_at: null,
    created_at: now,
    updated_at: now
  }
];

export const sampleGpsLatestPositions: GpsLatestPosition[] = sampleGpsPositions.map((position) => ({
  ...position,
  device_name: "MV930G-デモ管理対象",
  imei: "359339080000001",
  device_identifier: "13912345678",
  connection_status: "online",
  last_seen_at: now,
  vehicle_type: "car",
  maker: "トヨタ",
  model_name: "プリウス",
  license_plate: "福岡 300 あ 12-34",
  customer_name: "山田 太郎",
  customer_phone: "090-1234-5678",
  contract_status: "active"
}));

export const sampleGpsAdminData: GpsAdminData = {
  customers: sampleGpsCustomers,
  vehicles: sampleGpsVehicles,
  devices: sampleGpsDevices,
  positions: sampleGpsPositions,
  latestPositions: sampleGpsLatestPositions,
  rawLogs: sampleRawDeviceLogs,
  operationLogs: sampleOperationLogs,
  commandQueue: sampleDeviceCommandQueue,
  isDemo: true
};
