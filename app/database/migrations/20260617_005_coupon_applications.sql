-- Coupon application state for table sessions.
-- Customers can apply a coupon from QR order; checkout redeems it into table_bills.

create table if not exists public.table_applied_coupons (
  id bigint generated always as identity primary key,
  table_id bigint references public.tables(id) on delete set null,
  table_name text not null,
  coupon_id bigint references public.coupons(id) on delete set null,
  coupon_code text not null,
  discount_type text not null,
  discount_value numeric(10,2) not null default 0,
  status text not null default 'applied',
  session_start_at timestamptz,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'table_applied_coupons_discount_type_check'
  ) then
    alter table public.table_applied_coupons
      add constraint table_applied_coupons_discount_type_check
      check (discount_type in ('percent', 'fixed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'table_applied_coupons_status_check'
  ) then
    alter table public.table_applied_coupons
      add constraint table_applied_coupons_status_check
      check (status in ('applied', 'redeemed', 'cancelled'));
  end if;
end $$;

create index if not exists idx_table_applied_coupons_table_status
  on public.table_applied_coupons(table_name, status, created_at desc);

create index if not exists idx_table_applied_coupons_session
  on public.table_applied_coupons(table_id, session_start_at, status);
