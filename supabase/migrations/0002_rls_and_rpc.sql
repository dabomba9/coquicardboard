-- MJ Card Hierarchy — RLS, auth trigger, views, and public-sharing RPC.

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.tiers         enable row level security;
alter table public.sets          enable row level security;
alter table public.cards         enable row level security;
alter table public.card_images   enable row level security;
alter table public.card_prices   enable row level security;
alter table public.price_history enable row level security;
alter table public.profiles      enable row level security;
alter table public.holdings      enable row level security;
alter table public.want_list     enable row level security;

-- ---------------------------------------------------------------------------
-- Catalog: world-readable, write-locked. No write policies => writes denied
-- for anon/authenticated. Seed scripts use the service-role key (bypasses RLS).
-- ---------------------------------------------------------------------------
create policy "catalog_read_tiers"       on public.tiers         for select using (true);
create policy "catalog_read_sets"        on public.sets          for select using (true);
create policy "catalog_read_cards"       on public.cards         for select using (true);
create policy "catalog_read_images"      on public.card_images   for select using (true);
create policy "catalog_read_prices"      on public.card_prices   for select using (true);
create policy "catalog_read_history"     on public.price_history for select using (true);

-- ---------------------------------------------------------------------------
-- Profiles: public ones readable by anyone; owner can always read/update own.
-- ---------------------------------------------------------------------------
create policy "profiles_read" on public.profiles
  for select using (is_public or id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- inserts handled by the handle_new_user() trigger (security definer)

-- ---------------------------------------------------------------------------
-- Holdings & want_list: fully private to the owner. Public exposure happens
-- ONLY through get_public_collection() (security definer) — one auditable
-- surface, no leaky public-read policies.
-- ---------------------------------------------------------------------------
create policy "holdings_all_own" on public.holdings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "want_list_all_own" on public.want_list
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  -- derive a candidate username from email local-part, sanitized
  base_username := regexp_replace(split_part(coalesce(new.email, 'collector'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if length(base_username) < 3 then
    base_username := 'collector';
  end if;
  base_username := left(base_username, 26);
  final_username := base_username;
  -- ensure uniqueness
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'full_name', final_username));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Best market value for a holding (matches grade_key, falls back to raw,
-- then to the card's seeded catalog value).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Per-user, per-tier rollup. RLS on holdings means a caller only ever sees
-- their own rows through this view.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Public collection RPC — the ONLY public window into a user's holdings.
-- Returns profile + per-tier rollup + public holding rows for a public user.
-- ---------------------------------------------------------------------------
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
    return null; -- no such public profile
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
