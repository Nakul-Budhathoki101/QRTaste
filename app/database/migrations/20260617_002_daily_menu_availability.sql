-- Daily menu availability.
-- Staff can set "2 available today"; tomorrow resets because rows are per service_date.

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

create index if not exists idx_menu_daily_availability_date
  on public.menu_daily_availability(service_date, menu_item_id);
