create table if not exists orders (
    id bigint generated always as identity primary key,
    table_name text not null,
    items jsonb not null,
    total_price bigint not null,
    status text not null default 'pending',
    created_at timestamptz default now()
);

create table if not exists table_bills (
    id bigint generated always as identity primary key,
    table_name text not null,
    items jsonb not null,
    total_price bigint not null,
    is_paid boolean default false,
    created_at timestamptz default now()
);

create table if not exists menu_items (
    id bigint generated always as identity primary key,
    name text not null,
    description text,
    price integer not null,
    image_url text,
    category text default 'Food',
    is_active boolean default true,
    created_at timestamptz default now()
);