import type { PropertyStatus, PropertyType, PublicationPermission } from "@/lib/types";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  land: "土地",
  old_house_land: "古家付き土地",
  detached_house: "戸建て",
  warehouse: "倉庫",
  store: "店舗",
  other: "その他"
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  draft: "非公開",
  published: "公開中",
  sold: "成約済み"
};

export const PERMISSION_LABELS: Record<PublicationPermission, string> = {
  permitted: "許諾済み",
  pending: "確認中",
  denied: "掲載不可",
  unknown: "未確認"
};

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県"
];
