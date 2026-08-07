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
  terminal_response: "端末共通応答",
  terminal_registration: "端末登録",
  terminal_authentication: "Terminal Authentication",
  heartbeat: "Heartbeat",
  terminal_logout: "端末ログアウト",
  location_report: "Location Information Report",
  transparent_uplink: "上り透過伝送",
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
  disarm: "DISARM",
  customer_create: "顧客登録",
  customer_update: "顧客編集",
  customer_deactivate: "顧客無効化",
  vehicle_create: "車両登録",
  vehicle_update: "車両編集",
  vehicle_deactivate: "車両無効化",
  device_create: "GPS端末登録",
  device_update: "GPS端末編集",
  device_deactivate: "GPS端末無効化"
};

export const GPS_OPERATION_STATUS_LABELS: Record<GpsOperationStatus, string> = {
  queued: "待機中",
  sent: "送信済み",
  acknowledged: "完了",
  failed: "失敗",
  cancelled: "キャンセル"
};
