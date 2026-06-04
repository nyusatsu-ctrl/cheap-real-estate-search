insert into public.property_sources (id, name, website_url)
values
  ('11111111-1111-1111-1111-111111111111', '自治体空き家バンク サンプル', 'https://example.com/akiya'),
  ('22222222-2222-2222-2222-222222222222', '地元不動産会社 サンプル', 'https://example.com/estate'),
  ('33333333-3333-3333-3333-333333333333', '所有者直接掲載 サンプル', 'https://example.com/owner')
on conflict (id) do update set
  name = excluded.name,
  website_url = excluded.website_url;

insert into public.properties (
  id,
  title,
  property_type,
  price_yen,
  prefecture,
  city,
  address_display,
  land_area_m2,
  building_area_m2,
  construction_year,
  latitude,
  longitude,
  source_id,
  source_url,
  publication_permission,
  status,
  published_at
)
values
  ('00000000-0000-0000-0000-000000000001', '北海道小樽市の高台にある古家付き土地', 'old_house_land', 0, '北海道', '小樽市', '北海道小樽市末広町', 186.42, 72.80, 1974, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/1', 'permitted', 'published', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000002', '青森県弘前市のコンパクトな戸建て', 'detached_house', 580000, '青森県', '弘前市', '青森県弘前市石渡', 142.11, 88.20, 1981, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/2', 'permitted', 'published', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000003', '秋田県横手市の倉庫付き宅地', 'warehouse', 980000, '秋田県', '横手市', '秋田県横手市平鹿町', 310.55, 124.40, 1978, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/3', 'permitted', 'published', now() - interval '3 days'),
  ('00000000-0000-0000-0000-000000000004', '山形県鶴岡市の旧店舗物件', 'store', 1200000, '山形県', '鶴岡市', '山形県鶴岡市本町', 96.70, 131.50, 1969, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/4', 'pending', 'published', now() - interval '4 days'),
  ('00000000-0000-0000-0000-000000000005', '福島県会津若松市の住宅用地', 'land', 300000, '福島県', '会津若松市', '福島県会津若松市門田町', 214.18, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/5', 'permitted', 'published', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000006', '茨城県常陸太田市の平屋住宅', 'detached_house', 1500000, '茨城県', '常陸太田市', '茨城県常陸太田市里美町', 265.90, 69.40, 1985, null, null, '33333333-3333-3333-3333-333333333333', 'https://example.com/properties/6', 'permitted', 'published', now() - interval '6 days'),
  ('00000000-0000-0000-0000-000000000007', '栃木県日光市の山間部土地', 'land', 0, '栃木県', '日光市', '栃木県日光市足尾町', 421.20, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/7', 'permitted', 'published', now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000008', '群馬県桐生市の古家付き土地', 'old_house_land', 790000, '群馬県', '桐生市', '群馬県桐生市梅田町', 198.30, 85.10, 1972, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/8', 'permitted', 'published', now() - interval '8 days'),
  ('00000000-0000-0000-0000-000000000009', '新潟県上越市の作業場付き住宅', 'warehouse', 2300000, '新潟県', '上越市', '新潟県上越市柿崎区', 355.00, 148.60, 1988, null, null, '33333333-3333-3333-3333-333333333333', 'https://example.com/properties/9', 'permitted', 'published', now() - interval '9 days'),
  ('00000000-0000-0000-0000-000000000010', '富山県高岡市の小規模店舗', 'store', 1880000, '富山県', '高岡市', '富山県高岡市伏木', 112.40, 91.30, 1979, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/10', 'pending', 'published', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000011', '石川県七尾市の海近くの宅地', 'land', 460000, '石川県', '七尾市', '石川県七尾市能登島', 267.80, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/11', 'permitted', 'published', now() - interval '11 days'),
  ('00000000-0000-0000-0000-000000000012', '長野県飯山市の雪国戸建て', 'detached_house', 2500000, '長野県', '飯山市', '長野県飯山市瑞穂', 302.70, 110.20, 1990, null, null, '33333333-3333-3333-3333-333333333333', 'https://example.com/properties/12', 'permitted', 'published', now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000000013', '岐阜県郡上市の古民家風戸建て', 'detached_house', 3000000, '岐阜県', '郡上市', '岐阜県郡上市八幡町', 389.20, 154.70, 1965, null, null, '33333333-3333-3333-3333-333333333333', 'https://example.com/properties/13', 'permitted', 'published', now() - interval '13 days'),
  ('00000000-0000-0000-0000-000000000014', '三重県尾鷲市の港近く土地', 'land', 890000, '三重県', '尾鷲市', '三重県尾鷲市港町', 121.60, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/14', 'permitted', 'published', now() - interval '14 days'),
  ('00000000-0000-0000-0000-000000000015', '鳥取県倉吉市の店舗兼住宅', 'store', 1680000, '鳥取県', '倉吉市', '鳥取県倉吉市明治町', 138.90, 122.00, 1977, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/15', 'permitted', 'published', now() - interval '15 days'),
  ('00000000-0000-0000-0000-000000000016', '島根県益田市のゆとりある宅地', 'land', 0, '島根県', '益田市', '島根県益田市匹見町', 512.30, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/16', 'permitted', 'published', now() - interval '16 days'),
  ('00000000-0000-0000-0000-000000000017', '山口県萩市の古家付き土地', 'old_house_land', 640000, '山口県', '萩市', '山口県萩市椿東', 176.50, 73.20, 1971, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/17', 'permitted', 'published', now() - interval '17 days'),
  ('00000000-0000-0000-0000-000000000018', '高知県四万十市の平屋住宅', 'detached_house', 1350000, '高知県', '四万十市', '高知県四万十市西土佐', 244.00, 82.60, 1982, null, null, '33333333-3333-3333-3333-333333333333', 'https://example.com/properties/18', 'permitted', 'published', now() - interval '18 days'),
  ('00000000-0000-0000-0000-000000000019', '熊本県人吉市の倉庫物件', 'warehouse', 1100000, '熊本県', '人吉市', '熊本県人吉市下原田町', 288.10, 162.40, 1976, null, null, '22222222-2222-2222-2222-222222222222', 'https://example.com/properties/19', 'permitted', 'sold', null),
  ('00000000-0000-0000-0000-000000000020', '鹿児島県南九州市の農地近接宅地', 'land', 720000, '鹿児島県', '南九州市', '鹿児島県南九州市知覧町', 330.80, null, null, null, null, '11111111-1111-1111-1111-111111111111', 'https://example.com/properties/20', 'unknown', 'draft', null)
on conflict (id) do update set
  title = excluded.title,
  property_type = excluded.property_type,
  price_yen = excluded.price_yen,
  prefecture = excluded.prefecture,
  city = excluded.city,
  address_display = excluded.address_display,
  land_area_m2 = excluded.land_area_m2,
  building_area_m2 = excluded.building_area_m2,
  construction_year = excluded.construction_year,
  source_id = excluded.source_id,
  source_url = excluded.source_url,
  publication_permission = excluded.publication_permission,
  status = excluded.status,
  published_at = excluded.published_at;
