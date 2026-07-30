-- Legacy compatibility notice.
--
-- The profile trigger, trial reuse prevention, and property access policies are
-- now managed together by:
-- supabase/migrations/202607280001_property_trial_billing_access.sql
--
-- Apply that migration instead of maintaining a second trigger definition here.
do $$
begin
  raise notice 'Apply supabase/migrations/202607280001_property_trial_billing_access.sql';
end;
$$;
