import "server-only";

import {
  DEFAULT_CATALOGUE,
  type Catalogue,
  type CatalogueItem,
  type ItemGroup,
} from "@/lib/pricing";
import { createSupabaseAnonClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { isPortalConfigured } from "@/lib/supabase/env";

/**
 * The product catalogue, read from the database with the code as a fallback.
 *
 * src/lib/pricing.ts still ships a complete price list, and this module prefers
 * the database over it. The fallback is not defensive padding: /he/price is a
 * marketing page that must render prices with no Supabase configuration at all
 * — that is how the site behaved before the portal existed and how it must keep
 * behaving. A price list that goes blank during an outage is worse than one
 * that is briefly out of date.
 *
 * Which means every read here is wrapped. A thrown error becomes the shipped
 * catalogue, and the page renders.
 */

/** The catalogue as the two SQL functions return it. */
interface CatalogueRow {
  key: string;
  label: string;
  note: string | null;
  txNote: string | null;
  group: ItemGroup;
  supplier: string | null;
  category: string | null;
  image: string | null;
  setup: string | number;
  monthly: string | number;
  maxQty: string | number;
  icon: string;
  sortOrder: string | number;
}

interface CataloguePayload {
  baseSetup: string | number | null;
  items: CatalogueRow[];
}

/**
 * Postgres numerics arrive as strings over the wire. Coercing here rather than
 * at each use site matters more than usual: a stray string would concatenate
 * instead of adding and put a nonsense total on a customer's document.
 */
function toCatalogue(payload: CataloguePayload | null): Catalogue | null {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) return null;

  const baseSetup = Number(payload.baseSetup);
  if (!Number.isFinite(baseSetup)) return null;

  const items: CatalogueItem[] = payload.items.map((row) => ({
    id: row.key,
    label: row.label,
    note: row.note ?? "",
    txNote: row.txNote ?? "",
    group: row.group,
    supplier: row.supplier ?? null,
    category: row.category ?? null,
    image: row.image ?? null,
    setup: Number(row.setup),
    monthly: Number(row.monthly),
    maxQty: Math.max(1, Math.round(Number(row.maxQty) || 1)),
    icon: row.icon,
  }));

  return { baseSetup, items };
}

async function loadVia(fn: "price_list" | "agent_price_list"): Promise<Catalogue> {
  if (!isPortalConfigured()) return DEFAULT_CATALOGUE;

  try {
    // The public list is read with a session-less client on purpose. Reading
    // cookies would make /he/price dynamic, and that page is meant to be
    // pre-rendered and revalidated on a timer rather than served per request.
    const supabase =
      fn === "price_list" ? createSupabaseAnonClient() : await createSupabaseServerClient();
    const { data, error } = await supabase.rpc(fn);
    if (error) {
      console.error(`[products] ${fn} failed, falling back to the shipped catalogue`, error);
      return DEFAULT_CATALOGUE;
    }
    return toCatalogue(data as CataloguePayload | null) ?? DEFAULT_CATALOGUE;
  } catch (error) {
    console.error(`[products] ${fn} threw, falling back to the shipped catalogue`, error);
    return DEFAULT_CATALOGUE;
  }
}

/**
 * What the public calculator shows: active products flagged for the website.
 * Reachable with no session — price_list() is granted to anon precisely so this
 * page needs no privilege of its own.
 */
export function loadPublicCatalogue(): Promise<Catalogue> {
  return loadVia("price_list");
}

/**
 * What an agent may sell: every active product, advertised or not. An agent-only
 * item — a bespoke integration, a partner rate — is quotable without appearing
 * on the marketing page.
 */
export function loadAgentCatalogue(): Promise<Catalogue> {
  return loadVia("agent_price_list");
}

/**
 * The hardware showcase: what a visitor sees on the kiosk page.
 *
 * A separate list from the calculator's on purpose. price_list() adds up a
 * monthly subscription; a ₪29,800 cash kiosk in that arithmetic changes what
 * the page is. This one carries a price, a picture and a category, and no
 * manufacturer — who builds the cabinet is a fact about our supply chain, not
 * about what the customer is buying.
 *
 * No shipped fallback, unlike the catalogue. There is no hardware in
 * pricing.ts to fall back to, and a marketing section that renders nothing is
 * better than one that renders a stale price for a five-figure object. A failed
 * read returns an empty list and the section does not appear.
 */
export interface ShowcaseItem {
  key: string;
  label: string;
  note: string | null;
  category: string | null;
  image: string | null;
  setup: number;
}

export async function loadHardwareShowcase(): Promise<ShowcaseItem[]> {
  if (!isPortalConfigured()) return [];

  try {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("hardware_list");
    if (error) {
      console.error("[products] hardware_list failed", error);
      return [];
    }
    if (!Array.isArray(data)) return [];

    return (data as Array<Record<string, unknown>>)
      .map((row) => ({
        key: String(row.key ?? ""),
        label: String(row.label ?? ""),
        note: row.note == null ? null : String(row.note),
        category: row.category == null ? null : String(row.category),
        image: row.image == null ? null : String(row.image),
        // Numerics arrive as strings. A stray string here would concatenate
        // into a nonsense price on a public page.
        setup: Number(row.setup),
      }))
      .filter((item) => item.key && item.label && Number.isFinite(item.setup));
  } catch (error) {
    console.error("[products] hardware_list threw", error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════
//  Administration
// ════════════════════════════════════════════════════════════
export interface ProductRow {
  id: string;
  key: string;
  label: string;
  note: string | null;
  tx_note: string | null;
  item_group: ItemGroup;
  supplier: string | null;
  category: string | null;
  image: string | null;
  setup: number;
  monthly: number;
  max_qty: number;
  icon: string;
  sort_order: number;
  is_active: boolean;
  show_on_website: boolean;
  updated_at: string;
}

export class ProductError extends Error {}

const GROUPS: ItemGroup[] = ["core", "addon_included", "addon_excluded", "mobile_app", "hardware"];

/** Every product including retired ones. RLS lets any agent read; only an admin writes. */
export async function listProducts(): Promise<ProductRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("item_group")
    .order("sort_order")
    .order("key");

  if (error) throw new Error(`Could not load the catalogue: ${error.message}`);
  return (data ?? []) as ProductRow[];
}

export interface ProductInput {
  key?: string;
  label?: string;
  note?: string | null;
  txNote?: string | null;
  group?: ItemGroup;
  supplier?: string | null;
  category?: string | null;
  image?: string | null;
  setup?: number;
  monthly?: number;
  maxQty?: number;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  showOnWebsite?: boolean;
}

function money(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ProductError(`${field}: מחיר לא תקין`);
  // Two decimals, matching numeric(12,2). Rounding here rather than letting the
  // database truncate keeps what the admin typed and what is stored identical.
  return Math.round(n * 100) / 100;
}

function normalize(input: ProductInput, forCreate: boolean) {
  const row: Record<string, unknown> = {};

  if (forCreate || input.key !== undefined) {
    const key = String(input.key ?? "").trim().toLowerCase();
    // The key is written onto every quote line as component_key, so it must stay
    // stable and URL-plain. Enforced again by a check constraint in SQL.
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(key)) {
      throw new ProductError("מזהה חייב להיות באנגלית קטנה, ספרות, מקף או קו תחתון");
    }
    row.key = key;
  }

  if (forCreate || input.label !== undefined) {
    const label = String(input.label ?? "").trim().slice(0, 120);
    if (!label) throw new ProductError("חסר שם מוצר");
    row.label = label;
  }

  if (forCreate || input.group !== undefined) {
    const group = input.group as ItemGroup;
    if (!GROUPS.includes(group)) throw new ProductError("קבוצה לא מוכרת");
    row.item_group = group;
  }

  if (input.note !== undefined) row.note = String(input.note ?? "").trim().slice(0, 200) || null;
  if (input.txNote !== undefined) row.tx_note = String(input.txNote ?? "").trim().slice(0, 200) || null;
  if (input.icon !== undefined) row.icon = String(input.icon ?? "box").trim().slice(0, 40) || "box";

  // Merchandising, not pricing: item_group decides where the money lands, these
  // two only decide what shows up when someone filters a long list. Blank means
  // null rather than "", so "no supplier" is one value and not two.
  if (input.supplier !== undefined) row.supplier = String(input.supplier ?? "").trim().slice(0, 80) || null;
  if (input.category !== undefined) row.category = String(input.category ?? "").trim().slice(0, 80) || null;

  // A local path or nothing. The pictures were copied out of the WordPress
  // library rather than linked to it, so that renaming a file over there cannot
  // silently blank an image on a customer's quote. The database says the same
  // thing with a check constraint; this is here so a mistake produces a
  // sentence instead of a constraint name.
  if (input.image !== undefined) {
    const image = String(input.image ?? "").trim();
    if (!image) row.image = null;
    else if (!/^\/images\/products\/[a-z0-9._-]+$/.test(image)) {
      throw new ProductError("תמונה חייבת להיות קובץ מקומי תחת /images/products/");
    } else row.image = image;
  }

  if (forCreate || input.setup !== undefined) row.setup = money(input.setup ?? 0, "הקמה");
  if (forCreate || input.monthly !== undefined) row.monthly = money(input.monthly ?? 0, "חודשי");

  if (forCreate || input.maxQty !== undefined) {
    const qty = Math.round(Number(input.maxQty ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > 999) throw new ProductError("כמות מקסימלית חייבת להיות בין 1 ל-999");
    row.max_qty = qty;
  }

  if (input.sortOrder !== undefined) {
    const order = Math.round(Number(input.sortOrder));
    row.sort_order = Number.isFinite(order) ? Math.min(9999, Math.max(0, order)) : 0;
  }

  if (input.isActive !== undefined) row.is_active = input.isActive === true;
  if (input.showOnWebsite !== undefined) row.show_on_website = input.showOnWebsite === true;

  // Hardware is bought, not rented. The database enforces this too; catching it
  // here means the admin gets a sentence rather than a constraint name.
  const group = row.item_group ?? input.group;
  if (group === "hardware" && Number(row.monthly ?? 0) > 0) {
    throw new ProductError("מוצר פיזי לא יכול לשאת תשלום חודשי");
  }

  return row;
}

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert(normalize(input, true))
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new ProductError("כבר קיים מוצר עם המזהה הזה");
    if (error.code === "42501") throw new ProductError("רק מנהל מערכת יכול לערוך את המחירון");
    throw new ProductError(`יצירת המוצר נכשלה: ${error.message}`);
  }
  return data as ProductRow;
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  const patch = normalize(input, false);
  if (Object.keys(patch).length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);

  if (error) {
    if (error.code === "23505") throw new ProductError("כבר קיים מוצר עם המזהה הזה");
    if (error.code === "42501") throw new ProductError("רק מנהל מערכת יכול לערוך את המחירון");
    throw new ProductError(`עדכון המוצר נכשל: ${error.message}`);
  }
}

/**
 * Products are retired, never deleted.
 *
 * Every stored quote line refers to a product by key. Deleting the row would not
 * corrupt those lines — labels and prices are frozen onto them at issue time —
 * but it would erase the only record of what the key ever meant, which is the
 * thing anyone reading an old quote actually needs.
 */
export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  return updateProduct(id, { isActive });
}
