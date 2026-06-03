-- MJ Card Hierarchy — initial schema
-- Two domains: a shared read-only catalog (tiers/sets/cards/images/prices)
-- and per-user data (profiles/holdings/want_list). RLS (0002) enforces the boundary.

create extension if not exists "citext";
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.tiers (
  id          smallint primary key,            -- 1..4
  name        text not null,
  slug        text not null unique,
  rank        smallint not null,               -- display order (1 = top)
  description text,
  card_count  int not null default 0           -- denormalized for display
);

create table public.sets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  year         smallint,
  manufacturer text,
  slug         text not null unique
);

create table public.cards (
  id                 uuid primary key default gen_random_uuid(),
  tier_id            smallint not null references public.tiers(id),
  set_id             uuid references public.sets(id),
  name               text not null,
  card_number        text,
  year               smallint,
  is_rookie          boolean not null default false,
  is_insert          boolean not null default false,
  is_parallel        boolean not null default false,
  parallel_of        uuid references public.cards(id),
  print_run          int,                        -- serial-numbered run, null if unknown/unnumbered
  serial_numbered    boolean not null default false,
  pack_odds          text,                       -- e.g. "1:7,500"
  attributes         jsonb not null default '{}'::jsonb, -- auto/patch/refractor flags etc.
  primary_image_id   uuid,                       -- FK added after card_images exists
  rarity_rank        int not null default 0,     -- within-tier ordering for the hierarchy view
  catalog_value_cents bigint,                    -- seeded "book" value; superseded by card_prices
  external_ids       jsonb not null default '{}'::jsonb, -- {psa_spec_id, cardladder_id, tcdb_id}
  slug               text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index cards_tier_idx on public.cards (tier_id, rarity_rank);
create index cards_set_idx  on public.cards (set_id);

create table public.card_images (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.cards(id) on delete cascade,
  storage_path text not null,                    -- object path in a Storage bucket
  kind         text not null default 'front',    -- front | back | thumb
  source       text not null default 'placeholder', -- user_upload | licensed | ebay_cache | placeholder
  attribution  text,
  width        int,
  height       int,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint card_images_kind_chk check (kind in ('front','back','thumb')),
  constraint card_images_source_chk check (source in ('user_upload','licensed','ebay_cache','placeholder'))
);
create index card_images_card_idx on public.card_images (card_id);

alter table public.cards
  add constraint cards_primary_image_fk
  foreign key (primary_image_id) references public.card_images(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Market value
-- ---------------------------------------------------------------------------

create table public.card_prices (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.cards(id) on delete cascade,
  grade_key     text not null default 'raw',     -- raw | PSA10 | PSA9 | BGS9.5 ...
  median_cents  bigint,
  last_sale_cents bigint,
  currency      text not null default 'USD',
  sample_size   int,
  source        text not null default 'manual',  -- manual | ebay | cardladder | 130point
  as_of         timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (card_id, grade_key)
);
create index card_prices_card_idx on public.card_prices (card_id);

create table public.price_history (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  grade_key   text not null default 'raw',
  value_cents bigint not null,
  recorded_on date not null,
  source      text not null default 'manual'
);
create index price_history_idx on public.price_history (card_id, grade_key, recorded_on);

-- ---------------------------------------------------------------------------
-- Identity / per-user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext not null unique,
  display_name text,
  avatar_url   text,
  bio          text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint username_format_chk check (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

create table public.holdings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  card_id             uuid not null references public.cards(id) on delete cascade,
  condition_type      text not null default 'raw',  -- raw | graded
  grading_company     text,                          -- PSA | BGS | SGC
  grade               numeric(3,1),                  -- 10, 9.5, 9 ...
  cert_number         text,
  quantity            smallint not null default 1,
  purchase_price_cents bigint,
  purchase_currency   text not null default 'USD',
  acquired_at         date,
  for_trade           boolean not null default false,
  is_public           boolean not null default true, -- per-copy override for public profile
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint condition_type_chk check (condition_type in ('raw','graded')),
  constraint grading_company_chk check (grading_company is null or grading_company in ('PSA','BGS','SGC')),
  constraint quantity_chk check (quantity > 0),
  -- graded copies must carry a company + grade; raw copies must not
  constraint graded_consistency_chk check (
    (condition_type = 'graded' and grading_company is not null and grade is not null)
    or (condition_type = 'raw' and grading_company is null and grade is null)
  )
);
create index holdings_user_idx on public.holdings (user_id);
create index holdings_card_idx on public.holdings (card_id);

create table public.want_list (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  card_id        uuid not null references public.cards(id) on delete cascade,
  priority       smallint not null default 2,   -- 1 high .. 3 low
  max_price_cents bigint,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (user_id, card_id),
  constraint priority_chk check (priority between 1 and 3)
);
create index want_list_user_idx on public.want_list (user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_updated_at    before update on public.cards    for each row execute function public.set_updated_at();
create trigger holdings_updated_at before update on public.holdings for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Derived grade_key helper (maps a holding to a card_prices.grade_key)
-- ---------------------------------------------------------------------------

create or replace function public.holding_grade_key(p_condition text, p_company text, p_grade numeric)
returns text language sql immutable as $$
  select case
    when p_condition = 'graded' and p_company is not null and p_grade is not null
      then p_company || trim(to_char(p_grade, 'FM999990.9'))
    else 'raw'
  end;
$$;
