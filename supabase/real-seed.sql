insert into public.property_sources (id, name, website_url)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '留萌市空き家情報バンク', 'https://www.e-rumoi.jp/rumoilife/estate/'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '熊本県空き家バンクプラットフォーム', 'https://kumamoto-akiya360.jp/')
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
  ('aaaaaaaa-0000-0000-0000-000000000137', '北海道留萌市東雲町1丁目［築36年］4LDK', 'detached_house', 0, '北海道', '留萌市', '北海道留萌市東雲町1丁目72番地の5', 197.50, 103.68, 1988, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://www.e-rumoi.jp/rumoilife/estate/id_137/', 'unknown', 'published', now()),
  ('aaaaaaaa-0000-0000-0000-000000000894', '熊本県宇土市笹原町 100万円以下物件 4DK', 'detached_house', 1000000, '熊本県', '宇土市', '熊本県宇土市笹原町', 667.14, 80.90, 1973, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'https://kumamoto-akiya360.jp/property/p1000000894/', 'unknown', 'published', now()),
  ('aaaaaaaa-0000-0000-0000-000000000177', '北海道留萌市見晴町4丁目22番地5［築37年］', 'detached_house', 1500000, '北海道', '留萌市', '北海道留萌市見晴町4丁目22番地5', 176.80, 134.46, 1987, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://www.e-rumoi.jp/rumoilife/estate/id_177/', 'unknown', 'published', now()),
  ('aaaaaaaa-0000-0000-0000-000000000526', '北海道留萌市寿町3丁目13番地4［築54年］', 'detached_house', 2000000, '北海道', '留萌市', '北海道留萌市寿町3丁目13番地4', 689.50, 119.17, 1970, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://www.e-rumoi.jp/rumoilife/estate/id_526/', 'unknown', 'published', now()),
  ('aaaaaaaa-0000-0000-0000-000000000469', '北海道留萌市千鳥町4丁目107番地4［築49年］', 'detached_house', 3000000, '北海道', '留萌市', '北海道留萌市千鳥町4丁目107番地4', 504.50, 99.63, 1975, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://www.e-rumoi.jp/rumoilife/estate/id_469/', 'unknown', 'published', now()),
  ('aaaaaaaa-0000-0000-0000-000000000103', '北海道留萌市元町5丁目［築41年］3LDK', 'detached_house', 2000000, '北海道', '留萌市', '北海道留萌市元町5丁目64番地', 89.25, 82.75, 1983, null, null, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'https://www.e-rumoi.jp/rumoilife/estate/id_103/', 'unknown', 'sold', null)
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
