-- QRTaste V2 POS foundation migration.
-- Run after app/database/init.sql. Safe to run more than once.

alter table public.menu_items
  add column if not exists is_sold_out boolean not null default false,
  add column if not exists allergens jsonb not null default '[]'::jsonb;

alter table public.orders
  add column if not exists customer_note text,
  add column if not exists order_type text not null default 'dine_in',
  add column if not exists priority text not null default 'normal';

alter table public.table_bills
  add column if not exists status text not null default 'unpaid',
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists coupon_code text,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.coupons (
  id bigint generated always as identity primary key,
  code text not null unique,
  discount_type text not null,
  discount_value numeric(10,2) not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_calls (
  id bigint generated always as identity primary key,
  table_id bigint references public.tables(id) on delete set null,
  table_name text not null,
  call_type text not null,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.menu_daily_availability (
  id bigint generated always as identity primary key,
  menu_item_id bigint not null references public.menu_items(id) on delete cascade,
  service_date date not null,
  available_quantity integer,
  remaining_quantity integer,
  is_sold_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_item_id, service_date)
);

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'orders_status_check'
  ) then
    alter table public.orders drop constraint orders_status_check;
  end if;

  alter table public.orders
    add constraint orders_status_check
    check (status in ('pending', 'preparing', 'ready', 'delivered', 'completed'));

  if not exists (
    select 1 from pg_constraint where conname = 'orders_order_type_check'
  ) then
    alter table public.orders
      add constraint orders_order_type_check
      check (order_type in ('dine_in', 'takeout'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_priority_check'
  ) then
    alter table public.orders
      add constraint orders_priority_check
      check (priority in ('normal', 'high', 'rush'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'table_bills_status_check'
  ) then
    alter table public.table_bills
      add constraint table_bills_status_check
      check (status in ('unpaid', 'paid', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_discount_type_check'
  ) then
    alter table public.coupons
      add constraint coupons_discount_type_check
      check (discount_type in ('percent', 'fixed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'service_calls_status_check'
  ) then
    alter table public.service_calls
      add constraint service_calls_status_check
      check (status in ('open', 'acknowledged', 'resolved'));
  end if;
end $$;

update public.table_bills
set status = case when is_paid then 'paid' else 'unpaid' end
where status is null or status = 'unpaid';

create index if not exists idx_menu_items_sold_out on public.menu_items(is_sold_out);
create index if not exists idx_menu_items_allergens on public.menu_items using gin(allergens);
create index if not exists idx_orders_type_status on public.orders(order_type, status, created_at desc);
create index if not exists idx_table_bills_status_created_at on public.table_bills(status, created_at desc);
create index if not exists idx_coupons_code_active on public.coupons(code, is_active);
create index if not exists idx_service_calls_status_created on public.service_calls(status, created_at desc);
create index if not exists idx_menu_daily_availability_date on public.menu_daily_availability(service_date, menu_item_id);
