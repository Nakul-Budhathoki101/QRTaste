-- Active QR session token for each table session.
-- Old customer QR links become invalid when a table session ends or moves.

alter table public.tables
  add column if not exists session_token text;

create index if not exists idx_tables_session_token on public.tables(session_token);
