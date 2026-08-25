-- ---------------------------------------------------------------------------
-- Public profile completion could exceed 100%.
--
-- `tiers` describes the MJ hierarchy and nothing else: seed-catalog.ts skips the
-- tiers upsert for Kobe and Mamba, so `tiers.card_count` is always the 378-card
-- split (27/54/81/216). But Kobe-hierarchy and Mamba cards carry a COSMETIC
-- tier_id of 1-4 (it drives placeholder colour and sort order, not rarity), and
-- both objects below joined `tiers -> cards` with no catalog filter. So those
-- cards were counted into MJ's buckets while the denominator stayed MJ-only.
--
-- Measured before this migration: tier 3 joined 201 cards (81 MJ + 120 foreign)
-- against a denominator of 81. A collector holding only Kobe/Mamba tier-3 cards
-- reported 95 of 81 owned — 117%, with the meter bar past full.
--
-- Both objects are re-declared with `create or replace`: idempotent, no data is
-- touched, safe to re-run.
-- ---------------------------------------------------------------------------

-- Not referenced by the app today, but fixed rather than left broken: a wrong
-- view in the schema is a trap for whoever reads it next.
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
  left join public.cards c    on c.tier_id = t.id and c.catalog = 'mj-hierarchy'
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
    return null; -- no such public profile
  end if;

  select to_jsonb(p) - 'id' into v_profile
    from (select username, display_name, avatar_url, bio from public.profiles where id = v_user_id) p;

  -- The tier rollup is MJ-hierarchy completion, matching /collection's ring.
  select jsonb_agg(row order by row->>'tier_rank') into v_tiers from (
    select jsonb_build_object(
      'tier_id', t.id, 'tier_name', t.name, 'tier_rank', t.rank,
      'total_cards', t.card_count,
      'owned_cards', count(distinct h.card_id)
    ) as row
    from public.tiers t
    left join public.cards c on c.tier_id = t.id and c.catalog = 'mj-hierarchy'
    left join public.holdings h on h.card_id = c.id and h.user_id = v_user_id and h.is_public
    group by t.id, t.name, t.rank, t.card_count
  ) s;

  -- Deliberately NOT catalog-filtered: this is every card the collector owns and
  -- has chosen to make public. Only the rollup above is hierarchy-scoped.
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
