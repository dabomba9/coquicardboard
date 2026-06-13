-- Merge the Jordan Vault into the main `cards` table so it reuses the existing
-- holdings / want_list / card_prices / detail machinery. Vault cards are marked
-- catalog='vault' and have no tier (the 378-card MJ Hierarchy stays catalog='mj').
alter table public.cards
  add column if not exists catalog text not null default 'mj';

-- Vault cards have no tier; the hierarchy's 378 keep theirs (1..4).
alter table public.cards
  alter column tier_id drop not null;

create index if not exists cards_catalog_idx on public.cards (catalog);
