grant usage on schema public to anon, authenticated;

grant select on public.property_sources to anon, authenticated;
grant select on public.properties to anon, authenticated;
grant select on public.property_images to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.property_sources to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.property_images to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select, insert, update, delete on public.estimate_requests to authenticated;
grant select, insert, update, delete on public.contractor_applications to authenticated;
grant select, insert, update, delete on public.estimate_quotes to authenticated;
grant select, insert, delete on public.saved_properties to authenticated;

grant insert on public.estimate_requests to anon;
grant insert on public.contractor_applications to anon;
grant insert on public.estimate_quotes to anon;
