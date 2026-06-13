import "server-only";
import vaultData from "@/data/vault.json";

// The Jordan Vault is a file-backed, browse-only catalog (separate from the
// 378-card MJ Hierarchy and the Supabase `cards` table). Records come from
// jordan-vault/build-app-data.ts with hasFront/hasBack flags; the actual image
// URLs are built here against the `vault-images` Supabase Storage bucket so the
// same data works in any environment. A missing object falls back to CardThumb's
// placeholder.
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/vault-images`;
const imageUrl = (id: number, side: "front" | "back") => `${STORAGE_BASE}/${id}-${side}.jpg`;

type RawVaultCard = {
  id: number;
  slug: string | null;
  name: string | null;
  year: number | null;
  manufacturer: string | null;
  brand: string | null;
  cardNumber: string | null;
  cardType: string | null;
  tier: number | null;
  page: number | null;
  row: number | null;
  hasFront: boolean;
  hasBack: boolean;
  psaPopReport: string | null;
};

export type VaultCard = Omit<RawVaultCard, "hasFront" | "hasBack"> & {
  frontImage: string | null;
  backImage: string | null;
};

/** Slim shape passed to the client grid (keeps the payload small). */
export type VaultTile = Pick<
  VaultCard,
  "id" | "name" | "year" | "manufacturer" | "cardNumber" | "cardType" | "tier" | "frontImage"
>;

function hydrate(c: RawVaultCard): VaultCard {
  const { hasFront, hasBack, ...rest } = c;
  return {
    ...rest,
    frontImage: hasFront ? imageUrl(c.id, "front") : null,
    backImage: hasBack ? imageUrl(c.id, "back") : null,
  };
}

export const VAULT: VaultCard[] = (vaultData as RawVaultCard[]).map(hydrate);

export function getVaultCard(id: number): VaultCard | null {
  return VAULT.find((c) => c.id === id) ?? null;
}

export function vaultTiles(): VaultTile[] {
  return VAULT.map((c) => ({
    id: c.id,
    name: c.name,
    year: c.year,
    manufacturer: c.manufacturer,
    cardNumber: c.cardNumber,
    cardType: c.cardType,
    tier: c.tier,
    frontImage: c.frontImage,
  }));
}

export function relatedVaultCards(card: VaultCard, limit = 6): VaultCard[] {
  return VAULT.filter((c) => c.id !== card.id && c.manufacturer === card.manufacturer).slice(0, limit);
}
