-- ---------------------------------------------------------------------------
-- Public profiles described every collector as an MJ collector.
--
-- get_public_collection's only rollup is MJ-hierarchy tier completion (0007), so
-- /u/<username> for a Kobe or Clemente collector showed "0 of 378 MJ Hierarchy
-- cards owned" above a list of cards from catalogs it never mentioned.
--
-- This adds a per-catalog rollup for the catalogs the collector actually holds
-- public cards in (owned vs that catalog's full size), and tags each holding with
-- its catalog so the for-trade list can be grouped. The MJ `tiers` rollup is
-- unchanged and still MJ-only — the page shows it as a breakdown, not a headline.
--
-- `create or replace`, additive keys only: callers that don't read `catalogs`
-- are unaffected. Safe to re-run.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_collection(p_username citext)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id  uuid;
  v_profile  jsonb;
  v_tiers    jsonb;
  v_catalogs jsonb;
  v_cards    jsonb;
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

  -- Completion per catalog the collector holds public cards in. Only those
  -- catalogs: a Clemente collector's profile shouldn't list six empty meters.
  -- The denominator is counted per owned catalog (cards_catalog_idx, 0006).
  with owned as (
    select c.catalog, count(distinct h.card_id) as owned_cards
      from public.holdings h
      join public.cards c on c.id = h.card_id
     where h.user_id = v_user_id and h.is_public
     group by c.catalog
  )
  select jsonb_agg(jsonb_build_object(
    'catalog', o.catalog,
    'owned_cards', o.owned_cards,
    'total_cards', (select count(*) from public.cards x where x.catalog = o.catalog)
  )) into v_catalogs
  from owned o;

  -- Deliberately NOT catalog-filtered: this is every card the collector owns and
  -- has chosen to make public. Only the rollup above is hierarchy-scoped.
  select jsonb_agg(jsonb_build_object(
    'card_id', c.id, 'card_name', c.name, 'card_slug', c.slug, 'tier_id', c.tier_id,
    'catalog', c.catalog,
    'condition_type', h.condition_type, 'grading_company', h.grading_company,
    'grade', h.grade, 'quantity', h.quantity, 'for_trade', h.for_trade
  )) into v_cards
  from public.holdings h
  join public.cards c on c.id = h.card_id
  where h.user_id = v_user_id and h.is_public;

  return jsonb_build_object(
    'profile',  v_profile,
    'tiers',    coalesce(v_tiers, '[]'::jsonb),
    'catalogs', coalesce(v_catalogs, '[]'::jsonb),
    'holdings', coalesce(v_cards, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_collection(citext) to anon, authenticated;
