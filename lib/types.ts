// App-level domain types (hand-written; mirror the SQL schema in supabase/migrations).
// Catalog rows are read-only to clients; holdings/want_list/profile are per-user.

export type Tier = {
  id: number;
  name: string;
  slug: string;
  rank: number;
  description: string | null;
  card_count: number;
};

export type CardSet = {
  id: string;
  name: string;
  year: number | null;
  manufacturer: string | null;
  slug: string;
};

export type Card = {
  id: string;
  tier_id: number;
  set_id: string | null;
  name: string;
  card_number: string | null;
  year: number | null;
  is_rookie: boolean;
  is_insert: boolean;
  is_parallel: boolean;
  print_run: number | null;
  serial_numbered: boolean;
  pack_odds: string | null;
  attributes: Record<string, unknown>;
  primary_image_id: string | null;
  rarity_rank: number;
  catalog_value_cents: number | null;
  external_ids: Record<string, unknown>;
  image_url: string | null;
  image_source: string | null;
  slug: string;
};

export type CardWithSet = Card & { sets: CardSet | null };

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean;
};

export type ConditionType = "raw" | "graded";
export type GradingCompany = "PSA" | "BGS" | "SGC";

export type Holding = {
  id: string;
  user_id: string;
  card_id: string;
  condition_type: ConditionType;
  grading_company: GradingCompany | null;
  grade: number | null;
  cert_number: string | null;
  quantity: number;
  purchase_price_cents: number | null;
  purchase_currency: string;
  acquired_at: string | null;
  for_trade: boolean;
  is_public: boolean;
  notes: string | null;
};

export type CardPrice = {
  card_id: string;
  grade_key: string;
  median_cents: number | null;
  last_sale_cents: number | null;
  source: string;
  as_of: string;
};

export type TierSummary = {
  tier_id: number;
  tier_name: string;
  tier_rank: number;
  total_cards: number;
  owned_cards: number;
  est_value_cents?: number;
};

export type PublicCollection = {
  profile: Pick<Profile, "username" | "display_name" | "avatar_url" | "bio">;
  tiers: TierSummary[];
  holdings: {
    card_id: string;
    card_name: string;
    card_slug: string;
    tier_id: number;
    condition_type: ConditionType;
    grading_company: GradingCompany | null;
    grade: number | null;
    quantity: number;
    for_trade: boolean;
  }[];
};
