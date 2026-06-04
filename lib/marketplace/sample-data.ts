export const sampleEstimateRequests = [
  {
    id: "REQ-2026-0001",
    property_title: "北海道留萌市東雲町1丁目［築36年］4LDK",
    requester_name: "山田 太郎",
    requester_email: "taro@example.com",
    requester_phone: "090-0000-0000",
    categories: ["demolition", "junk_removal"],
    timeline: "購入前に概算を知りたい",
    message: "古家の解体と残置物処分の概算を知りたいです。購入判断に使います。",
    status: "estimating",
    created_at: "2026-06-03T00:00:00.000Z"
  },
  {
    id: "REQ-2026-0002",
    property_title: "熊本県宇土市笹原町 100万円以下物件 4DK",
    requester_name: "佐藤 花子",
    requester_email: "hanako@example.com",
    requester_phone: "080-0000-0000",
    categories: ["renovation", "ownership_transfer"],
    timeline: "3か月以内",
    message: "水回りリフォームと名義変更の概算を知りたいです。",
    status: "new",
    created_at: "2026-06-03T00:00:00.000Z"
  }
];

export const sampleContractorApplications = [
  {
    id: "CON-001",
    company_name: "北日本解体サービス",
    contact_name: "田中 一郎",
    phone: "011-000-0000",
    email: "contractor@example.com",
    service_categories: ["demolition", "junk_removal"],
    service_areas: ["北海道"],
    commission_rate: 10,
    status: "approved"
  },
  {
    id: "CON-002",
    company_name: "九州リフォーム工房",
    contact_name: "中村 二郎",
    phone: "096-000-0000",
    email: "renovation@example.com",
    service_categories: ["renovation", "civil_engineering"],
    service_areas: ["熊本県", "福岡県"],
    commission_rate: 10,
    status: "pending"
  }
];

export const sampleQuotes = [
  {
    id: "QUOTE-001",
    estimate_request_id: "REQ-2026-0001",
    contractor_name: "北日本解体サービス",
    work_summary: "木造住宅解体、残置物処分、簡易整地",
    quote_amount_yen: 1320000,
    platform_fee_rate: 10,
    platform_fee_yen: 132000,
    customer_visible_amount_yen: 1320000,
    status: "submitted"
  }
];
