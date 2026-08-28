-- Repair the service_role privileges on an already-applied sales e-contract
-- schema. Supabase default privileges can otherwise retain TRUNCATE,
-- REFERENCES, and TRIGGER after narrower grants are added.

do $$
declare
  target text;
begin
  foreach target in array array[
    'sales_econtracts',
    'sales_econtract_access_sessions',
    'sales_econtract_verifications',
    'sales_econtract_events'
  ] loop
    if to_regclass(format('public.%I', target)) is null then
      raise exception 'required sales e-contract table is missing: public.%', target;
    end if;
  end loop;
end;
$$;

revoke all on table public.sales_econtracts from service_role;
revoke all on table public.sales_econtract_access_sessions from service_role;
revoke all on table public.sales_econtract_verifications from service_role;
revoke all on table public.sales_econtract_events from service_role;

grant select, insert, update on table public.sales_econtracts to service_role;
grant select, insert, update, delete on table public.sales_econtract_access_sessions to service_role;
grant select, insert, update on table public.sales_econtract_verifications to service_role;
grant select, insert on table public.sales_econtract_events to service_role;
