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

create table bills (
    id bigint generated always as identity primary key,
    table_id bigint not null,
    table_name text not null,
    items jsonb not null,
    subtotal numeric(10,2) not null default 0,
    tax numeric(10,2) not null default 0,
    total numeric(10,2) not null default 0,
    status text not null default 'unpaid',
    created_at timestamptz not null default now(),
    paid_at timestamptz
);

create table menu_categories (
    id bigint generated always as identity primary key,
    name text not null unique,
    sort_order int default 0,
    is_active boolean default true,
    created_at timestamptz default now()
);

create table menu_sub_categories (
    id bigint generated always as identity primary key,
    category_id bigint not null,
    name text not null,
    sort_order int default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    constraint fk_menu_sub_category
    foreign key (category_id)
    references menu_categories(id)
);