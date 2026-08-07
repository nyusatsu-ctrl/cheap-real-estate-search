export type GpsNavigationItem = {
  href: string;
  label: string;
  developmentOnly?: boolean;
};

export const GPS_PRODUCTION_NAVIGATION: readonly GpsNavigationItem[] = [
  { href: "/admin/gps", label: "GPSダッシュボード" },
  { href: "/admin/gps/customers", label: "顧客" },
  { href: "/admin/gps/vehicles", label: "車両" },
  { href: "/admin/gps/devices", label: "GPS端末" },
  { href: "/admin/gps/positions", label: "現在位置・走行履歴" },
  { href: "/admin/gps/raw-logs", label: "受信ログ" },
  { href: "/admin/gps/parse-errors", label: "解析エラー" },
  { href: "/admin/gps/operations", label: "アラーム・操作履歴" },
  { href: "/admin/gps/usage", label: "通信量" }
];

export const GPS_DEVELOPMENT_NAVIGATION: readonly GpsNavigationItem[] = [
  { href: "/admin/gps/mock", label: "モック投入", developmentOnly: true },
  { href: "/admin/gps/test", label: "実機テスト手順", developmentOnly: true }
];

export function getGpsNavigation(nodeEnv: string | undefined) {
  return nodeEnv === "development"
    ? [...GPS_PRODUCTION_NAVIGATION, ...GPS_DEVELOPMENT_NAVIGATION]
    : [...GPS_PRODUCTION_NAVIGATION];
}
