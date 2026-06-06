-- 熊本県空き家バンクから取り込み済みの非公開物件を一括で公開中にします。
-- 成約済みは変更しません。
update public.properties as p
set
  status = 'published',
  published_at = coalesce(p.published_at, now()),
  updated_at = now()
from public.property_sources as s
where p.source_id = s.id
  and s.name = '熊本県空き家バンク'
  and p.status = 'draft'
  and p.price_yen between 0 and 30000000
  and p.source_url is not null;
