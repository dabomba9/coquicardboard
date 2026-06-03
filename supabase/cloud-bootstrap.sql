-- ============================================================================
-- Coqui Cardboard — CLOUD bootstrap (run ONCE in Supabase → SQL Editor)
-- This is migrations 0001–0004 concatenated. Paste the whole file, click Run.
-- Safe to re-run: uses if-not-exists / on-conflict / drop-if-exists where it matters.
-- ============================================================================


-- ============================================================================
-- 0001_init.sql — schema
-- ============================================================================
create extension if not exists "citext";
create extension if not exists "pgcrypto"; -- gen_random_uuid()

create table if not exists public.tiers (
  id          smallint primary key,
  name        text not null,
  slug        text not null unique,
  rank        smallint not null,
  description text,
  card_count  int not null default 0
);

create table if not exists public.sets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  year         smallint,
  manufacturer text,
  slug         text not null unique
);

create table if not exists public.cards (
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
  print_run          int,
  serial_numbered    boolean not null default false,
  pack_odds          text,
  attributes         jsonb not null default '{}'::jsonb,
  primary_image_id   uuid,
  rarity_rank        int not null default 0,
  catalog_value_cents bigint,
  external_ids       jsonb not null default '{}'::jsonb,
  slug               text not null unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists cards_tier_idx on public.cards (tier_id, rarity_rank);
create index if not exists cards_set_idx  on public.cards (set_id);

create table if not exists public.card_images (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.cards(id) on delete cascade,
  storage_path text not null,
  kind         text not null default 'front',
  source       text not null default 'placeholder',
  attribution  text,
  width        int,
  height       int,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint card_images_kind_chk check (kind in ('front','back','thumb')),
  constraint card_images_source_chk check (source in ('user_upload','licensed','ebay_cache','placeholder'))
);
create index if not exists card_images_card_idx on public.card_images (card_id);

alter table public.cards
  drop constraint if exists cards_primary_image_fk;
alter table public.cards
  add constraint cards_primary_image_fk
  foreign key (primary_image_id) references public.card_images(id) on delete set null;

create table if not exists public.card_prices (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.cards(id) on delete cascade,
  grade_key     text not null default 'raw',
  median_cents  bigint,
  last_sale_cents bigint,
  currency      text not null default 'USD',
  sample_size   int,
  source        text not null default 'manual',
  as_of         timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (card_id, grade_key)
);
create index if not exists card_prices_card_idx on public.card_prices (card_id);

create table if not exists public.price_history (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  grade_key   text not null default 'raw',
  value_cents bigint not null,
  recorded_on date not null,
  source      text not null default 'manual'
);
create index if not exists price_history_idx on public.price_history (card_id, grade_key, recorded_on);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext not null unique,
  display_name text,
  avatar_url   text,
  bio          text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint username_format_chk check (username ~ '^[a-zA-Z0-9_]{3,30}$')
);

create table if not exists public.holdings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  card_id             uuid not null references public.cards(id) on delete cascade,
  condition_type      text not null default 'raw',
  grading_company     text,
  grade               numeric(3,1),
  cert_number         text,
  quantity            smallint not null default 1,
  purchase_price_cents bigint,
  purchase_currency   text not null default 'USD',
  acquired_at         date,
  for_trade           boolean not null default false,
  is_public           boolean not null default true,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint condition_type_chk check (condition_type in ('raw','graded')),
  constraint grading_company_chk check (grading_company is null or grading_company in ('PSA','BGS','SGC')),
  constraint quantity_chk check (quantity > 0),
  constraint graded_consistency_chk check (
    (condition_type = 'graded' and grading_company is not null and grade is not null)
    or (condition_type = 'raw' and grading_company is null and grade is null)
  )
);
create index if not exists holdings_user_idx on public.holdings (user_id);
create index if not exists holdings_card_idx on public.holdings (card_id);

create table if not exists public.want_list (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  card_id        uuid not null references public.cards(id) on delete cascade,
  priority       smallint not null default 2,
  max_price_cents bigint,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (user_id, card_id),
  constraint priority_chk check (priority between 1 and 3)
);
create index if not exists want_list_user_idx on public.want_list (user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_updated_at on public.cards;
create trigger cards_updated_at    before update on public.cards    for each row execute function public.set_updated_at();
drop trigger if exists holdings_updated_at on public.holdings;
create trigger holdings_updated_at before update on public.holdings for each row execute function public.set_updated_at();

create or replace function public.holding_grade_key(p_condition text, p_company text, p_grade numeric)
returns text language sql immutable as $$
  select case
    when p_condition = 'graded' and p_company is not null and p_grade is not null
      then p_company || trim(to_char(p_grade, 'FM999990.9'))
    else 'raw'
  end;
$$;


-- ============================================================================
-- 0002_rls_and_rpc.sql — RLS, auth trigger, views, public-sharing RPC
-- ============================================================================
alter table public.tiers         enable row level security;
alter table public.sets          enable row level security;
alter table public.cards         enable row level security;
alter table public.card_images   enable row level security;
alter table public.card_prices   enable row level security;
alter table public.price_history enable row level security;
alter table public.profiles      enable row level security;
alter table public.holdings      enable row level security;
alter table public.want_list     enable row level security;

drop policy if exists "catalog_read_tiers"   on public.tiers;
drop policy if exists "catalog_read_sets"    on public.sets;
drop policy if exists "catalog_read_cards"   on public.cards;
drop policy if exists "catalog_read_images"  on public.card_images;
drop policy if exists "catalog_read_prices"  on public.card_prices;
drop policy if exists "catalog_read_history" on public.price_history;
create policy "catalog_read_tiers"       on public.tiers         for select using (true);
create policy "catalog_read_sets"        on public.sets          for select using (true);
create policy "catalog_read_cards"       on public.cards         for select using (true);
create policy "catalog_read_images"      on public.card_images   for select using (true);
create policy "catalog_read_prices"      on public.card_prices   for select using (true);
create policy "catalog_read_history"     on public.price_history for select using (true);

drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (is_public or id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "holdings_all_own"  on public.holdings;
drop policy if exists "want_list_all_own" on public.want_list;
create policy "holdings_all_own" on public.holdings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "want_list_all_own" on public.want_list
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := regexp_replace(split_part(coalesce(new.email, 'collector'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if length(base_username) < 3 then
    base_username := 'collector';
  end if;
  base_username := left(base_username, 26);
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'full_name', final_username));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.holding_value_cents(
  p_card_id uuid, p_condition text, p_company text, p_grade numeric, p_quantity int
) returns bigint language sql stable as $$
  select coalesce(
    (select cp.median_cents from public.card_prices cp
      where cp.card_id = p_card_id
        and cp.grade_key = public.holding_grade_key(p_condition, p_company, p_grade)
      limit 1),
    (select cp.median_cents from public.card_prices cp
      where cp.card_id = p_card_id and cp.grade_key = 'raw' limit 1),
    (select c.catalog_value_cents from public.cards c where c.id = p_card_id),
    0
  ) * greatest(p_quantity, 1);
$$;

create or replace view public.user_collection_summary
with (security_invoker = true) as
  select
    h.user_id,
    t.id   as tier_id,
    t.name as tier_name,
    t.rank as tier_rank,
    count(distinct h.card_id) as owned_cards,
    t.card_count              as total_cards,
    coalesce(sum(public.holding_value_cents(
      h.card_id, h.condition_type, h.grading_company, h.grade, h.quantity)), 0) as est_value_cents
  from public.tiers t
  left join public.cards c    on c.tier_id = t.id
  left join public.holdings h on h.card_id = c.id
  group by h.user_id, t.id, t.name, t.rank, t.card_count;

create or replace function public.get_public_collection(p_username citext)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_profile jsonb;
  v_tiers   jsonb;
  v_cards   jsonb;
begin
  select id into v_user_id from public.profiles
   where username = p_username and is_public = true;

  if v_user_id is null then
    return null;
  end if;

  select to_jsonb(p) - 'id' into v_profile
    from (select username, display_name, avatar_url, bio from public.profiles where id = v_user_id) p;

  select jsonb_agg(row order by row->>'tier_rank') into v_tiers from (
    select jsonb_build_object(
      'tier_id', t.id, 'tier_name', t.name, 'tier_rank', t.rank,
      'total_cards', t.card_count,
      'owned_cards', count(distinct h.card_id)
    ) as row
    from public.tiers t
    left join public.cards c on c.tier_id = t.id
    left join public.holdings h on h.card_id = c.id and h.user_id = v_user_id and h.is_public
    group by t.id, t.name, t.rank, t.card_count
  ) s;

  select jsonb_agg(jsonb_build_object(
    'card_id', c.id, 'card_name', c.name, 'card_slug', c.slug, 'tier_id', c.tier_id,
    'condition_type', h.condition_type, 'grading_company', h.grading_company,
    'grade', h.grade, 'quantity', h.quantity, 'for_trade', h.for_trade
  )) into v_cards
  from public.holdings h
  join public.cards c on c.id = h.card_id
  where h.user_id = v_user_id and h.is_public;

  return jsonb_build_object(
    'profile', v_profile,
    'tiers',   coalesce(v_tiers, '[]'::jsonb),
    'holdings', coalesce(v_cards, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_collection(citext) to anon, authenticated;


-- ============================================================================
-- 0003_card_image_url.sql — external image URL per card
-- ============================================================================
alter table public.cards
  add column if not exists image_url text,
  add column if not exists image_source text;


-- ============================================================================
-- 0004_card_images_bucket.sql — public Storage bucket for self-hosted images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

drop policy if exists "card-images public read" on storage.objects;
create policy "card-images public read" on storage.objects
  for select using (bucket_id = 'card-images');

-- ============================================================================
-- Done. Tables, RLS, RPC, and the card-images bucket are ready.
-- ============================================================================
