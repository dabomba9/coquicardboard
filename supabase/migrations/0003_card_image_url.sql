-- M2: external image URL per card (no Storage uploads this round).
-- image_source records provenance/attribution for the URL (auditable, removable).
alter table public.cards
  add column if not exists image_url text,
  add column if not exists image_source text;
