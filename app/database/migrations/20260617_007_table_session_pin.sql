-- Session PIN for permanent table QR access.
-- Permanent QR identifies the table; session_pin identifies the current seated customer session.

alter table public.tables
  add column if not exists session_pin text;

create index if not exists idx_tables_session_pin on public.tables(session_pin);
