-- Theresa Shoes — initial schema bootstrap
-- Generated from api/app/db/models.py (source of truth) / api/schema.dbml
--
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> Run).
-- Safe to re-run: enums and tables are only created if they don't already exist.
--
-- NOTE: this repo has no Alembic migrations set up yet (alembic is in requirements.txt
-- but unconfigured). Until that's added, this file + schema.dbml are the only record
-- of the schema — keep them in sync with models.py by hand.

-- ── Enums ────────────────────────────────────────────────────────────────
do $$ begin
    create type company_status as enum ('active', 'archive');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type order_status as enum ('current', 'completed', 'archived');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type attribute_category as enum ('material', 'mold_type', 'heel_type', 'buckle', 'slingback', 'flatform');
exception
    when duplicate_object then null;
end $$;

-- ── devices ──────────────────────────────────────────────────────────────
-- Gates all admin traffic via the X-Device-Id header (see app/config/auth.py).
create table if not exists devices (
    id                    uuid primary key default gen_random_uuid(),
    device_token          varchar not null unique,
    label                 varchar,
    is_active             boolean not null default true,
    created_at            timestamptz not null default now(),
    last_seen_at          timestamptz,
    -- PIN brute-force protection: 10 wrong PINs from this device locks it out for 30 minutes.
    failed_pin_attempts   integer not null default 0,
    pin_locked_until      timestamptz
);

alter table devices
    add column if not exists failed_pin_attempts integer not null default 0,
    add column if not exists pin_locked_until timestamptz;

-- ── admin_pin ────────────────────────────────────────────────────────────
-- Single-row table holding the shared admin PIN hash.
create table if not exists admin_pin (
    id            integer primary key,
    pin_hash      varchar not null,
    updated_at    timestamptz not null default now()
);

-- ── companies ────────────────────────────────────────────────────────────
create table if not exists companies (
    id            uuid primary key default gen_random_uuid(),
    name          varchar not null,
    status        company_status not null default 'active',
    created_at    timestamptz not null default now(),
    -- Set when status transitions to 'archive' (see company_service.update_company).
    archived_at   timestamptz
);

alter table companies
    add column if not exists archived_at timestamptz;

-- Case-insensitive uniqueness — find_or_create_company matches by ILIKE, so the DB needs to
-- enforce the same case-insensitive dedup to close a TOCTOU race between two near-simultaneous
-- guest submissions naming the same not-yet-existing company.
create unique index if not exists ix_companies_name_lower on companies (lower(name));

-- ── shoes ────────────────────────────────────────────────────────────────
create table if not exists shoes (
    id            uuid primary key default gen_random_uuid(),
    name          varchar not null,
    price         numeric(10, 2) not null,
    description   text,
    is_hidden     boolean not null default false,
    created_at    timestamptz not null default now()
);

-- ── shoe_images ──────────────────────────────────────────────────────────
create table if not exists shoe_images (
    id            uuid primary key default gen_random_uuid(),
    shoe_id       uuid not null references shoes(id),
    image_url     varchar not null,
    sort_order    integer not null default 0
);

-- ── shoe_attribute_options ───────────────────────────────────────────────
-- Polymorphic option table: materials, mold types, heel types, buckles,
-- slingbacks, flatforms — distinguished by `category`.
create table if not exists shoe_attribute_options (
    id             uuid primary key default gen_random_uuid(),
    category       attribute_category not null,
    name           varchar not null,
    swatch_color   varchar,  -- materials only (swatch rows)
    image_url      varchar,  -- mold_type / heel_type / buckle / slingback / flatform
    is_active      boolean not null default true,
    parent_id      uuid references shoe_attribute_options(id) on delete cascade,
    -- materials only: null = a group (e.g. "Helga"), set = a swatch belonging to that group
    created_at     timestamptz not null default now()
);

alter table shoe_attribute_options
    add column if not exists parent_id uuid references shoe_attribute_options(id) on delete cascade;

-- ── orders ───────────────────────────────────────────────────────────────
create table if not exists orders (
    id                uuid primary key default gen_random_uuid(),
    company_id        uuid references companies(id),
    client_name       varchar not null,
    contact_number    varchar,
    -- nullable: manually-entered orders may name a model not in the catalog (custom_model_name)
    shoe_id           uuid references shoes(id),
    custom_model_name varchar,
    material_id       uuid references shoe_attribute_options(id),
    mold_type_id      uuid references shoe_attribute_options(id),
    heel_type_id      uuid references shoe_attribute_options(id),
    color_code        varchar,
    size              integer,
    heel_size         integer,
    quantity          integer not null default 1,
    with_buckle       boolean not null default false,
    buckle_id         uuid references shoe_attribute_options(id),
    with_flatform     boolean not null default false,
    flatform_id       uuid references shoe_attribute_options(id),
    with_slingback    boolean not null default false,
    slingback_id      uuid references shoe_attribute_options(id),
    unit_price        numeric(10, 2) not null,
    status            order_status not null default 'current',
    -- Ordered mixed-content note: text / photo / drawing blocks the guest composed,
    -- plus "selection" blocks mirroring their material/mold/heel/buckle/flatform/slingback picks.
    -- e.g. [{"type": "text", "value": "flat feet"}, {"type": "drawing", "value": "https://..."}]
    notes_blocks      jsonb not null default '[]'::jsonb,
    created_at        timestamptz not null default now(),
    -- Set when status transitions to 'completed' (see order_service.update_order).
    completed_at      timestamptz,
    -- Set when status transitions to 'archived'. completed_at is preserved through archiving
    -- so archived orders can still be told apart as "was current" vs "was completed".
    archived_at       timestamptz,
    -- True only when this order was archived as part of its company being archived — restoring
    -- the company only un-archives orders flagged this way (see company_service cascade).
    archived_with_company boolean not null default false
);

alter table orders
    drop column if exists notes_text,
    drop column if exists notes_image_url,
    drop column if exists notes_drawing_url,
    add column if not exists notes_blocks jsonb not null default '[]'::jsonb,
    add column if not exists completed_at timestamptz,
    add column if not exists archived_at timestamptz,
    add column if not exists custom_model_name varchar,
    add column if not exists archived_with_company boolean not null default false,
    alter column shoe_id drop not null;

create index if not exists ix_orders_company_id on orders(company_id);
create index if not exists ix_orders_status on orders(status);
create index if not exists ix_orders_created_at on orders(created_at);

-- Run on its own (can't be combined with other statements in one transaction/SQL editor run):
-- alter type order_status add value if not exists 'archived';

-- ── payments ─────────────────────────────────────────────────────────────
create table if not exists payments (
    id                     uuid primary key default gen_random_uuid(),
    order_id               uuid not null unique references orders(id),
    client_name            varchar,  -- denormalized from orders for display
    total_amount           numeric(10, 2) not null,
    first_payment          numeric(10, 2) not null default 0,
    second_payment         numeric(10, 2) not null default 0,
    third_payment          numeric(10, 2) not null default 0,
    balance                numeric(10, 2) not null,
    balance_cleared_date   date,
    date_delivered         date
);
