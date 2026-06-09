import type {
  GpsAccStatus,
  GpsConnectionStatus,
  GpsContractStatus,
  GpsContractType,
  GpsOperationStatus,
  GpsOperationType,
  GpsPacketType,
  GpsParseStatus,
  GpsRelayStatus,
  GpsVehicleStatus,
  GpsVehicleType
} from "@/lib/gps/types";

export const GPS_CONTRACT_TYPE_LABELS: Record<GpsContractType, string> = {
  car: "車",
  bike: "バイク"
};

export const GPS_CONTRACT_STATUS_LABELS: Record<GpsContractStatus, string> = {
  screening: "審査中",
  active: "契約中",
  overdue: "延滞中",
  paid_off: "完済",
  cancelled: "解約"
};

export const GPS_VEHICLE_TYPE_LABELS: Record<GpsVehicleType, string> = {
  car: "車",
  bike: "バイク"
};

export const GPS_VEHICLE_STATUS_LABELS: Record<GpsVehicleStatus, string> = {
  active: "稼働中",
  sold: "販売済",
  returned: "返却",
  inactive: "停止"
};

export const GPS_CONNECTION_STATUS_LABELS: Record<GpsConnectionStatus, string> = {
  online: "オンライン",
  offline: "オフライン"
};

export const GPS_PACKET_TYPE_LABELS: Record<GpsPacketType, string> = {
  terminal_authentication: "Terminal Authentication",
  heartbeat: "Heartbeat",
  location_report: "Location Information Report",
  unknown: "未判定"
};

export const GPS_PARSE_STATUS_LABELS: Record<GpsParseStatus, string> = {
  pending: "解析待ち",
  parsed: "解析済み",
  failed: "解析失敗",
  unsupported: "未対応"
};

export const GPS_ACC_STATUS_LABELS: Record<GpsAccStatus, string> = {
  on: "ON",
  off: "OFF",
  unknown: "不明"
};

export const GPS_RELAY_STATUS_LABELS: Record<GpsRelayStatus, string> = {
  cut: "カット",
  restored: "復旧",
  unknown: "不明"
};

export const GPS_OPERATION_TYPE_LABELS: Record<GpsOperationType, string> = {
  safe_cut: "燃料カット",
  restore: "復旧",
  arm: "ARM",
  disarm: "DISARM"
};

export const GPS_OPERATION_STATUS_LABELS: Record<GpsOperationStatus, string> = {
  queued: "待機中",
  sent: "送信済み",
  acknowledged: "ACK受信",
  failed: "失敗",
  cancelled: "キャンセル"
};
