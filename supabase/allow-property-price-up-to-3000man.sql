alter table public.properties
drop constraint if exists properties_price_yen_check;

alter table public.properties
add constraint properties_price_yen_check
check (price_yen >= 0 and price_yen <= 30000000);
