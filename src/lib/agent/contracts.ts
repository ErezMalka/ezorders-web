import "server-only";

import { createQuote, type CreateQuoteInput } from "@/lib/agent/quotes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Contracts — what a quote becomes once the customer wants the terms in
 * writing.
 *
 * Nothing here assembles a contract. create_contract_from_quote() in SQL does
 * that, because the checks that matter are the ones this module cannot make
 * honestly: that the quote was actually sent, that the caller owns it, that a
 * human approved the terms. This reads contracts and asks the database to move
 * them.
 */

export type ContractStatus = "draft" | "sent" | "viewed" | "signed" | "cancelled";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "טיוטה",
  sent: "נשלח",
  viewed: "נצפה",
  signed: "נחתם",
  cancelled: "בוטל",
};

export interface ContractListRow {
  id: string;
  contract_number: string;
  status: ContractStatus;
  customer_name: string;
  agent_id: string;
  agent_name: string;
  quote_number: string;
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
  signer_name: string | null;
  view_count: number;
}

export interface ContractEventRow {
  id: number;
  event_type: string;
  at: string;
  ip: string | null;
  user_agent: string | null;
}

export interface ContractRow extends ContractListRow {
  quote_id: string;
  template_version: number;
  public_token: string;
  customer_tax_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  customer_email: string | null;
  term_months: number;
  signer_id_number: string | null;
  signer_role: string | null;
  document_hash: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  signed_email_sent_at: string | null;
  notes: string | null;
  item_notes: Record<string, string>;
  notes_updated_at: string | null;
}

/** One line of the quote this contract was drafted from, with its note. */
export interface ContractLineRow {
  component_key: string;
  label: string;
  note: string | null;
  quantity: number;
  setup_total: number;
  monthly_total: number;
  sort_order: number;
}

export class ContractError extends Error {}

/** Hebrew for every way the database can say no. */
const CODES: Record<string, string> = {
  not_an_agent: "המשתמש אינו סוכן פעיל",
  no_such_quote: "ההצעה לא נמצאה",
  not_your_quote: "ההצעה שייכת לסוכן אחר",
  quote_not_sent: "אפשר להפיק הסכם רק מהצעה שנשלחה ללקוח",
  no_approved_template:
    "אין נוסח הסכם מאושר. מנהל מערכת צריך לעבור על הנוסח ולאשר אותו לפני שאפשר להפיק הסכמים.",
  not_found: "ההסכם לא נמצא",
  not_yours: "ההסכם שייך לסוכן אחר",
  already_signed: "ההסכם כבר נחתם",
  cancelled: "ההסכם בוטל",
  bad_item_notes: "ההערות לא נשלחו בפורמט תקין",
};

function fail(code: string | undefined): never {
  throw new ContractError(CODES[code ?? ""] ?? "הפעולה נכשלה");
}

export async function listContracts(): Promise<ContractListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contracts_list")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load contracts: ${error.message}`);
  return (data ?? []) as ContractListRow[];
}

export async function getContract(id: string): Promise<ContractRow | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: row, error }, { data: listRow }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", id).maybeSingle(),
    supabase.from("contracts_list").select("*").eq("id", id).maybeSingle(),
  ]);

  if (error) throw new Error(`Could not load the contract: ${error.message}`);
  if (!row || !listRow) return null;
  return { ...(row as object), ...(listRow as object) } as ContractRow;
}

export async function getContractEvents(id: string): Promise<ContractEventRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contract_events")
    .select("id, event_type, at, ip, user_agent")
    .eq("contract_id", id)
    .order("at")
    .order("id");

  if (error) throw new Error(`Could not load the timeline: ${error.message}`);
  return (data ?? []) as ContractEventRow[];
}

/**
 * The lines the notes hang off.
 *
 * Read from the quote and not from the contract, because that is where they
 * live: a contract restates a quote, it does not copy it. component_key is the
 * key the notes are stored under, so the two lists cannot drift apart.
 */
export async function getContractLines(quoteId: string): Promise<ContractLineRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quote_items")
    .select("component_key, label, note, quantity, setup_total, monthly_total, sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order");

  if (error) throw new Error(`Could not load the contract lines: ${error.message}`);
  return (data ?? []) as ContractLineRow[];
}

/**
 * Save the agent's notes — per line and on the deal.
 *
 * Refused once there is a signature, and the database is what refuses: the
 * notes are inside the document the hash was taken over, so editing them after
 * signing would leave a stored fingerprint that disagrees with the stored text.
 */
export async function setContractNotes(
  id: string,
  notes: string,
  itemNotes: Record<string, string>
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contract_set_notes", {
    p_id: id,
    p_notes: notes,
    p_item_notes: itemNotes,
  });
  if (error) throw new ContractError(`שמירת ההערות נכשלה: ${error.message}`);

  const result = (data ?? {}) as { ok?: boolean; code?: string };
  if (result.ok !== true) fail(result.code);
}

export interface CreatedContract {
  id: string;
  token: string;
  contractNumber: string;
  /** True when this call found one rather than making one. */
  existed: boolean;
}

export async function createContractFromQuote(quoteId: string): Promise<CreatedContract> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_contract_from_quote", { p_quote: quoteId });
  if (error) throw new ContractError(`הפקת ההסכם נכשלה: ${error.message}`);

  const result = (data ?? {}) as {
    ok?: boolean; code?: string; id?: string; token?: string; contract_number?: string;
  };
  if (result.ok !== true) fail(result.code);

  return {
    id: result.id!,
    token: result.token!,
    contractNumber: result.contract_number!,
    existed: result.code === "already_exists",
  };
}

/**
 * A contract with no proposal in front of it.
 *
 * The price was agreed on the telephone and the customer is waiting for the
 * agreement, not for a proposal they have already said yes to. So the package
 * is written onto a quote that is never sent and never listed, and the contract
 * is drawn from it in the same breath.
 *
 * The quote is not a formality. Everything a contract renders — the customer,
 * the lines, the totals — hangs off it, its hash is taken over exactly those
 * words, and the pipeline counts the deal. A contract with nothing behind it
 * would be a signed deal invisible in every report the company reads.
 */
export async function createDirectContract(
  input: CreateQuoteInput,
  agentId: string
): Promise<CreatedContract & { quoteId: string }> {
  const quote = await createQuote(input, agentId, { directContract: true });
  const contract = await createContractFromQuote(quote.id);
  return { ...contract, quoteId: quote.id };
}

/** Moves a draft to sent and hands back the token to build the customer link. */
export async function sendContract(id: string): Promise<{ token: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contract_send", { p_id: id });
  if (error) throw new ContractError(`השליחה נכשלה: ${error.message}`);

  const result = (data ?? {}) as { ok?: boolean; code?: string; token?: string };
  if (result.ok !== true) fail(result.code);
  return { token: result.token! };
}

export async function cancelContract(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("contract_cancel", { p_id: id });
  if (error) throw new ContractError(`הביטול נכשל: ${error.message}`);

  const result = (data ?? {}) as { ok?: boolean; code?: string };
  if (result.ok !== true) fail(result.code);
}

// ════════════════════════════════════════════════════════════
//  The terms
// ════════════════════════════════════════════════════════════
export interface TemplateClause { num: string; text: string }
export interface TemplateSection { num: string; title: string; clauses: TemplateClause[] }

export interface ContractTemplate {
  version: number;
  title: string;
  sections: TemplateSection[];
  notes: string | null;
  is_approved: boolean;
  approved_at: string | null;
  is_current: boolean;
  created_at: string;
}

export async function listTemplates(): Promise<ContractTemplate[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .order("version", { ascending: false });

  if (error) throw new Error(`Could not load the terms: ${error.message}`);
  return (data ?? []) as ContractTemplate[];
}

export async function getCurrentTemplate(): Promise<ContractTemplate | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw new Error(`Could not load the terms: ${error.message}`);
  return (data as ContractTemplate | null) ?? null;
}

/**
 * Approving is a separate act from writing, and it is the interlock: until a
 * person says they have read the version against the source, no contract can be
 * issued from it. Recording who said so is the point — an approval nobody signs
 * is a checkbox.
 */
export async function approveTemplate(version: number, agentId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("contract_templates")
    .update({ is_approved: true, approved_by: agentId, approved_at: new Date().toISOString() })
    .eq("version", version);

  if (error) {
    if (error.code === "42501") throw new ContractError("רק מנהל מערכת יכול לאשר נוסח הסכם");
    throw new ContractError(`האישור נכשל: ${error.message}`);
  }
}

/**
 * A new version, never an edit.
 *
 * Every signed contract points at the version it was issued under, and a
 * document that silently re-renders under new terms is worth nothing in the one
 * argument it will ever be read in. So changing the terms writes a new row and
 * moves the flag; the old text stays exactly where the old contracts point.
 */
export async function publishTemplateVersion(input: {
  title: string;
  sections: TemplateSection[];
  notes?: string | null;
}): Promise<number> {
  const sections = normalizeSections(input.sections);
  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) throw new ContractError("חסרה כותרת להסכם");

  const supabase = await createSupabaseServerClient();

  const { data: last, error: readError } = await supabase
    .from("contract_templates")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new ContractError(`שמירת הנוסח נכשלה: ${readError.message}`);

  const version = ((last?.version as number | undefined) ?? 0) + 1;

  // Clear the flag first: exactly one row may be current, and the database
  // enforces it with a unique index rather than trusting this order.
  const { error: clearError } = await supabase
    .from("contract_templates")
    .update({ is_current: false })
    .eq("is_current", true);
  if (clearError) {
    if (clearError.code === "42501") throw new ContractError("רק מנהל מערכת יכול לערוך את נוסח ההסכם");
    throw new ContractError(`שמירת הנוסח נכשלה: ${clearError.message}`);
  }

  const { error } = await supabase.from("contract_templates").insert({
    version,
    title,
    sections,
    notes: input.notes?.trim() || null,
    // A new version is unread by definition, whoever typed it.
    is_approved: false,
    is_current: true,
  });

  if (error) {
    if (error.code === "42501") throw new ContractError("רק מנהל מערכת יכול לערוך את נוסח ההסכם");
    throw new ContractError(`שמירת הנוסח נכשלה: ${error.message}`);
  }
  return version;
}

function normalizeSections(sections: unknown): TemplateSection[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new ContractError("נוסח ההסכם ריק");
  }

  return sections.map((raw, i) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const num = String(s.num ?? "").trim().slice(0, 12);
    const title = String(s.title ?? "").trim().slice(0, 200);
    if (!num || !title) throw new ContractError(`פרק ${i + 1}: חסר מספר או כותרת`);

    const clauses = Array.isArray(s.clauses) ? s.clauses : [];
    if (clauses.length === 0) throw new ContractError(`פרק ${num}: אין בו סעיפים`);

    return {
      num,
      title,
      clauses: clauses.map((c, j) => {
        const clause = (c ?? {}) as Record<string, unknown>;
        const cnum = String(clause.num ?? "").trim().slice(0, 12);
        const text = String(clause.text ?? "").trim();
        if (!cnum) throw new ContractError(`פרק ${num}, סעיף ${j + 1}: חסר מספר`);
        if (!text) throw new ContractError(`סעיף ${cnum}: אין בו טקסט`);
        return { num: cnum, text };
      }),
    };
  });
}
