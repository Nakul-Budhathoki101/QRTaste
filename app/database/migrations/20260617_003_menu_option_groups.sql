-- Reusable menu option groups.
-- Examples: Mixer, Spicy Level, Pizza Adjustments.

create table if not exists public.menu_option_groups (
  id bigint generated always as identity primary key,
  name text not null unique,
  selection_type text not null default 'single',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_option_items (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.menu_option_groups(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(group_id, name)
);

create table if not exists public.menu_item_option_groups (
  menu_item_id bigint not null references public.menu_items(id) on delete cascade,
  option_group_id bigint not null references public.menu_option_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(menu_item_id, option_group_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menu_option_groups_selection_type_check'
  ) then
    alter table public.menu_option_groups
      add constraint menu_option_groups_selection_type_check
      check (selection_type in ('single', 'multiple'));
  end if;
end $$;

create index if not exists idx_menu_option_items_group on public.menu_option_items(group_id, sort_order);
create index if not exists idx_menu_item_option_groups_item on public.menu_item_option_groups(menu_item_id);
