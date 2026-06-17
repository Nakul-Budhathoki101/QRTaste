-- Supabase initial schema for the hotel / restaurant table-service app.
-- Safe to run more than once: creates missing tables and adds missing columns.

create table if not exists public.tables (
    id bigint generated always as identity primary key,
    name text not null unique,
    seats integer not null default 1,
    status text not null default 'available',
    "customerCount" integer,
    "startTime" timestamptz,
    "timeLimit" integer,
    session_token text,
    session_pin text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.tables add column if not exists seats integer not null default 1;
alter table public.tables add column if not exists status text not null default 'available';
alter table public.tables add column if not exists "customerCount" integer;
alter table public.tables add column if not exists "startTime" timestamptz;
alter table public.tables add column if not exists "timeLimit" integer;
alter table public.tables add column if not exists session_token text;
alter table public.tables add column if not exists session_pin text;
alter table public.tables add column if not exists created_at timestamptz not null default now();
alter table public.tables add column if not exists updated_at timestamptz not null default now();

create table if not exists public.table_reservations (
    id bigint generated always as identity primary key,
    table_id bigint references public.tables(id) on delete set null,
    table_name text not null,
    customer_name text not null,
    customer_phone text,
    guest_count integer not null default 1,
    reserved_at timestamptz not null,
    status text not null default 'reserved',
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.table_reservations add column if not exists table_id bigint;
alter table public.table_reservations add column if not exists table_name text;
alter table public.table_reservations add column if not exists customer_name text;
alter table public.table_reservations add column if not exists customer_phone text;
alter table public.table_reservations add column if not exists guest_count integer not null default 1;
alter table public.table_reservations add column if not exists reserved_at timestamptz;
alter table public.table_reservations add column if not exists status text not null default 'reserved';
alter table public.table_reservations add column if not exists notes text;
alter table public.table_reservations add column if not exists created_at timestamptz not null default now();
alter table public.table_reservations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.menu_categories (
    id bigint generated always as identity primary key,
    name text not null unique,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.menu_categories add column if not exists sort_order integer not null default 0;
alter table public.menu_categories add column if not exists is_active boolean not null default true;
alter table public.menu_categories add column if not exists created_at timestamptz not null default now();

create table if not exists public.menu_sub_categories (
    id bigint generated always as identity primary key,
    category_id bigint not null references public.menu_categories(id) on delete cascade,
    name text not null,
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.menu_sub_categories add column if not exists category_id bigint;
alter table public.menu_sub_categories add column if not exists sort_order integer not null default 0;
alter table public.menu_sub_categories add column if not exists is_active boolean not null default true;
alter table public.menu_sub_categories add column if not exists created_at timestamptz not null default now();

create table if not exists public.menu_items (
    id bigint generated always as identity primary key,
    name text not null,
    description text,
    price numeric(10,2) not null default 0,
    image_url text,
    category_id bigint references public.menu_categories(id) on delete set null,
    sub_category_id bigint references public.menu_sub_categories(id) on delete set null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.menu_items add column if not exists description text;
alter table public.menu_items add column if not exists price numeric(10,2) not null default 0;
alter table public.menu_items add column if not exists image_url text;
alter table public.menu_items add column if not exists category_id bigint;
alter table public.menu_items add column if not exists sub_category_id bigint;
alter table public.menu_items add column if not exists is_active boolean not null default true;
alter table public.menu_items add column if not exists created_at timestamptz not null default now();
alter table public.menu_items add column if not exists updated_at timestamptz not null default now();

create table if not exists public.orders (
    id bigint generated always as identity primary key,
    table_id bigint references public.tables(id) on delete set null,
    table_name text not null,
    items jsonb not null,
    total_price numeric(10,2) not null default 0,
    status text not null default 'pending',
    is_billed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists table_id bigint;
alter table public.orders add column if not exists table_name text;
alter table public.orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists total_price numeric(10,2) not null default 0;
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists is_billed boolean not null default false;
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create table if not exists public.table_bills (
    id bigint generated always as identity primary key,
    table_id bigint references public.tables(id) on delete set null,
    table_name text not null,
    items jsonb not null,
    subtotal numeric(10,2) not null default 0,
    tax_amount numeric(10,2) not null default 0,
    total_price numeric(10,2) not null default 0,
    payment_method text not null default 'online',
    is_paid boolean not null default false,
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.table_bills add column if not exists table_id bigint;
alter table public.table_bills add column if not exists table_name text;
alter table public.table_bills add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.table_bills add column if not exists subtotal numeric(10,2) not null default 0;
alter table public.table_bills add column if not exists tax_amount numeric(10,2) not null default 0;
alter table public.table_bills add column if not exists total_price numeric(10,2) not null default 0;
alter table public.table_bills add column if not exists payment_method text not null default 'online';
alter table public.table_bills add column if not exists is_paid boolean not null default false;
alter table public.table_bills add column if not exists paid_at timestamptz;
alter table public.table_bills add column if not exists created_at timestamptz not null default now();
alter table public.table_bills add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tables_status_check'
  ) then
    alter table public.tables
      add constraint tables_status_check
      check (status in ('available', 'occupied', 'reserved', 'cleaning'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'orders_status_check'
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('pending', 'preparing', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'table_reservations_status_check'
  ) then
    alter table public.table_reservations
      add constraint table_reservations_status_check
      check (status in ('reserved', 'seated', 'cancelled', 'completed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'table_bills_payment_method_check'
  ) then
    alter table public.table_bills
      add constraint table_bills_payment_method_check
      check (payment_method in ('online', 'barcode', 'credit_card', 'cash', 'other'));
  end if;
end $$;

create index if not exists idx_tables_status on public.tables(status);
create index if not exists idx_tables_session_token on public.tables(session_token);
create index if not exists idx_tables_session_pin on public.tables(session_pin);
create index if not exists idx_table_reservations_table_time on public.table_reservations(table_id, reserved_at);
create index if not exists idx_table_reservations_status_time on public.table_reservations(status, reserved_at);
create index if not exists idx_orders_status_created_at on public.orders(status, created_at desc);
create index if not exists idx_orders_table_name_created_at on public.orders(table_name, created_at desc);
create index if not exists idx_orders_unbilled_table on public.orders(table_name, is_billed, created_at desc);
create index if not exists idx_table_bills_created_at on public.table_bills(created_at desc);
create index if not exists idx_table_bills_payment_method on public.table_bills(payment_method);
create index if not exists idx_menu_items_category on public.menu_items(category_id, sub_category_id);
create index if not exists idx_menu_items_active on public.menu_items(is_active);
