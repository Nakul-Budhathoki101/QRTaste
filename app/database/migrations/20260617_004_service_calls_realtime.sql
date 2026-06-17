-- Enable Supabase realtime events for customer service calls.
-- Safe to run more than once.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'service_calls'
  ) then
    alter publication supabase_realtime add table public.service_calls;
  end if;
end $$;

alter table public.service_calls replica identity full;
