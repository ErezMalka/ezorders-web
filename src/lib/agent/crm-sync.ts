import "server-only";

import { CRM, createCrmClient, crmEnabled } from "@/lib/crm";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Pushing a signed contract into the CRM as an order.
 *
 * One press by a manager, one order in the CRM: the customer (found by tax id
 * or phone, created if new), the order with its lines, the product for every
 * line (created in the CRM's catalogue the first time a key is seen), and the
 * card payment when GROW has confirmed it. The CRM's own triggers then take
 * over — the onboarding checklist, the customer's product list, the office
 * notification — exactly as they do for an order typed in by hand.
 *
 * Idempotent by construction: contracts.crm_order_id is claimed before the
 * first CRM write and a contract that already carries one is returned as-is.
 * Money is never touched here; the CRM is told about a payment, not asked for
 * one.
 */

export class CrmSyncError extends Error {}

export interface CrmSyncResult {
  orderId: string;
  orderNumber: string;
  customerId: string;
  alreadySynced: boolean;
}

interface ContractRow {
  id: string;
  contract_number: string;
  status: string;
  public_token: string;
  customer_name: string;
  customer_tax_id: string | null;
  customer_address: string | null;
  business_phone: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  customer_email: string | null;
  pos_company: string | null;
  notes: string | null;
  signed_at: string | null;
  signer_name: string | null;
  document_hash: string | null;
  agent_id: string;
  quote_id: string;
  crm_order_id: string | null;
  crm_order_number: string | null;
  crm_customer_id: string | null;
  crm_synced_at: string | null;
}

interface QuoteRow {
  setup_total: string | number;
  hardware_total: string | number | null;
  monthly_total: string | number;
  vat_percent: string | number;
  term_months: number;
  customer_phone: string | null;
  customer_contact: string | null;
}

interface QuoteLine {
  component_key: string;
  label: string;
  note: string | null;
  item_group: string;
  quantity: number;
  setup_unit: string | number;
  monthly_unit: string | number;
  setup_total: string | number;
  monthly_total: string | number;
  sort_order: number;
}

const n = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function phoneDigits(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("972") ? `0${d.slice(3)}` : d;
}

function splitName(full: string | null): { first: string | null; last: string | null } {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0]!, last: null };
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

export function crmSyncEnabled(): boolean {
  return crmEnabled();
}

export async function pushContractToCrm(
  contractId: string,
  by: { agentId: string; agentName: string; ip?: string | null; userAgent?: string | null },
  origin: string
): Promise<CrmSyncResult> {
  if (!crmEnabled()) throw new CrmSyncError("החיבור ל-CRM אינו מוגדר באתר (CRM_SUPABASE_URL / CRM_SUPABASE_SERVICE_ROLE_KEY)");

  const admin = createSupabaseAdminClient();

  // ── what we are pushing ────────────────────────────────────────────────────
  const { data: c, error: cErr } = await admin
    .from("contracts")
    .select(
      "id, contract_number, status, public_token, customer_name, customer_tax_id, customer_address, business_phone, " +
        "contact_name, contact_phone, customer_email, pos_company, notes, signed_at, signer_name, document_hash, agent_id, quote_id, " +
        "crm_order_id, crm_order_number, crm_customer_id, crm_synced_at"
    )
    .eq("id", contractId)
    .is("deleted_at", null)
    .maybeSingle();
  if (cErr) throw new Error(`Could not load the contract: ${cErr.message}`);
  const contract = c as unknown as ContractRow | null;
  if (!contract) throw new CrmSyncError("ההסכם לא נמצא");
  if (contract.status !== "signed") throw new CrmSyncError("אפשר להעביר ל-CRM רק הסכם חתום");

  if (contract.crm_order_id && contract.crm_order_number) {
    return {
      orderId: contract.crm_order_id,
      orderNumber: contract.crm_order_number,
      customerId: contract.crm_customer_id ?? "",
      alreadySynced: true,
    };
  }

  const [{ data: q }, { data: lineRows }, { data: pay }, { data: agent }] = await Promise.all([
    admin
      .from("quotes")
      .select("setup_total, hardware_total, monthly_total, vat_percent, term_months, customer_phone, customer_contact")
      .eq("id", contract.quote_id)
      .maybeSingle(),
    admin
      .from("quote_items")
      .select("component_key, label, note, item_group, quantity, setup_unit, monthly_unit, setup_total, monthly_total, sort_order")
      .eq("quote_id", contract.quote_id)
      .order("sort_order"),
    admin
      .from("contract_payments")
      .select("id, amount, status, paid_at, grow_transaction_id")
      .eq("contract_id", contract.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("agents").select("full_name").eq("id", contract.agent_id).maybeSingle(),
  ]);
  const quote = q as unknown as QuoteRow | null;
  if (!quote) throw new CrmSyncError("להסכם אין הצעת מחיר מקושרת");
  const lines = (lineRows ?? []) as unknown as QuoteLine[];
  const payment = pay as { id: string; amount: string | number; paid_at: string | null; grow_transaction_id: string | null } | null;
  const agentName = (agent as { full_name: string } | null)?.full_name ?? null;

  // The base setup fee lives in the quote's total and in no line. Derived the
  // way the contract document derives it, so the CRM sums to the same number.
  const linesSetup = lines.reduce((s, l) => s + n(l.setup_total), 0);
  const baseSetup = round2(n(quote.setup_total) - linesSetup);
  const oneTimeExVat = round2(n(quote.setup_total) + n(quote.hardware_total));

  // ── claim it, so two clicks cannot make two orders ─────────────────────────
  const { data: claimed } = await admin
    .from("contracts")
    .update({ crm_synced_at: new Date().toISOString(), crm_synced_by: by.agentId })
    .eq("id", contract.id)
    .is("crm_order_id", null)
    .is("crm_synced_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) throw new CrmSyncError("ההעברה ל-CRM כבר רצה — רעננו את העמוד בעוד רגע");

  const release = async () => {
    await admin.from("contracts").update({ crm_synced_at: null, crm_synced_by: null }).eq("id", contract.id).is("crm_order_id", null);
  };

  try {
    const crm = createCrmClient();
    const contractUrl = `${origin.replace(/\/+$/, "")}/c/${contract.public_token}`;

    // ── the customer ─────────────────────────────────────────────────────────
    const customerId = await ensureCustomer(crm, contract, quote, agentName);

    // ── the products ─────────────────────────────────────────────────────────
    type OrderLine = { key: string; label: string; note: string | null; quantity: number; setupUnit: number; setupTotal: number; monthlyUnit: number; monthlyTotal: number; group: string };
    const orderLines: OrderLine[] = [];
    if (baseSetup > 0) {
      orderLines.push({ key: "initial", label: "הקמת מערכת ראשונית", note: null, quantity: 1, setupUnit: baseSetup, setupTotal: baseSetup, monthlyUnit: 0, monthlyTotal: 0, group: "core" });
    }
    for (const l of lines) {
      orderLines.push({
        key: l.component_key,
        label: l.label,
        note: l.note,
        quantity: Number(l.quantity) || 1,
        setupUnit: n(l.setup_unit),
        setupTotal: n(l.setup_total),
        monthlyUnit: n(l.monthly_unit),
        monthlyTotal: n(l.monthly_total),
        group: l.item_group,
      });
    }
    const productIds = new Map<string, string>();
    for (const l of orderLines) {
      if (!productIds.has(l.key)) productIds.set(l.key, await ensureProduct(admin, crm, l));
    }

    // ── the order ────────────────────────────────────────────────────────────
    const paid = Boolean(payment);
    const noteLines = [
      `הסכם ${contract.contract_number} נחתם באתר ezorders.com${contract.signed_at ? ` ב-${new Date(contract.signed_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}` : ""}${contract.signer_name ? ` על ידי ${contract.signer_name}` : ""}.`,
      `קישור להסכם החתום: ${contractUrl}`,
      contract.document_hash ? `טביעת המסמך (SHA-256): ${contract.document_hash}` : null,
      `תשלום חודשי (לפני מע״מ): ₪${n(quote.monthly_total).toLocaleString("he-IL")} · תקופה: ${quote.term_months} חודשים`,
      paid
        ? `שולם בכרטיס דרך GROW: ₪${n(payment!.amount).toLocaleString("he-IL")} כולל מע״מ${payment!.grow_transaction_id ? ` · עסקה ${payment!.grow_transaction_id}` : ""}`
        : "התשלום החד־פעמי טרם התקבל ב-GROW.",
      agentName ? `סוכן: ${agentName}` : null,
      contract.notes ? `הערות מההסכם: ${contract.notes}` : null,
    ].filter(Boolean);

    const { data: order, error: oErr } = await crm
      .from("orders")
      .insert({
        customer_id: customerId,
        customer_name: contract.contact_name ?? contract.customer_name,
        customer_phone: phoneDigits(contract.contact_phone) ?? phoneDigits(quote.customer_phone),
        customer_address: contract.customer_address,
        business_name: contract.customer_name,
        invoice_name: contract.customer_name,
        tax_id: contract.customer_tax_id,
        business_tax_id: contract.customer_tax_id,
        business_phone: phoneDigits(contract.business_phone),
        owner_name: contract.contact_name,
        owner_phone: phoneDigits(contract.contact_phone),
        email: contract.customer_email,
        pos_company: contract.pos_company,
        status_id: paid ? CRM.orderStatus.approved : CRM.orderStatus.awaitingPayment,
        payment_status: paid ? "completed" : "not_started",
        signature_status: "signed",
        requires_signature: false,
        source_type: CRM.sourceType,
        total_amount: oneTimeExVat,
        notes: noteLines.join("\n"),
        sales_notes: `נוצר אוטומטית מהסכם ${contract.contract_number} באתר · אושר על ידי ${by.agentName}`,
        signed_documents: [
          {
            type: "contract",
            source: "ezorders.com",
            number: contract.contract_number,
            url: contractUrl,
            sha256: contract.document_hash,
            signed_at: contract.signed_at,
            signer: contract.signer_name,
          },
        ],
      })
      .select("id, order_number")
      .single();
    if (oErr || !order) throw new CrmSyncError(`ה-CRM סירב ליצור הזמנה: ${oErr?.message ?? "unknown"}`);
    const orderId = String((order as { id: string }).id);
    const orderNumber = String((order as { order_number: string }).order_number);

    // ── the lines ────────────────────────────────────────────────────────────
    const { error: iErr } = await crm.from("order_items").insert(
      orderLines.map((l) => ({
        order_id: orderId,
        product_id: productIds.get(l.key),
        sku: `${CRM.skuPrefix}${l.key}`,
        quantity: l.quantity,
        unit_price: l.setupUnit,
        total_price: l.setupTotal,
        one_time_payment: l.setupTotal,
        monthly_payment: l.monthlyTotal,
        monthly_payment_amount: l.monthlyTotal,
        one_time_payment_method: paid ? "grow_card" : null,
        requires_installation: l.group === "hardware",
        private_notes: l.note,
      }))
    );
    if (iErr) throw new CrmSyncError(`ההזמנה ${orderNumber} נוצרה ב-CRM אבל השורות נכשלו: ${iErr.message}`);

    // ── the payment ──────────────────────────────────────────────────────────
    if (paid) {
      const { error: pErr } = await crm.from("payments").insert({
        order_id: orderId,
        payment_type: "grow_card",
        amount: n(payment!.amount),
        payment_date: (payment!.paid_at ?? new Date().toISOString()).slice(0, 10),
        notes: `GROW (משולם)${payment!.grow_transaction_id ? ` · עסקה ${payment!.grow_transaction_id}` : ""} · הסכם ${contract.contract_number} · כולל מע״מ`,
      });
      if (pErr) console.error("[crm-sync] payment row failed", pErr.message);
    }

    // ── remember it ──────────────────────────────────────────────────────────
    await admin
      .from("contracts")
      .update({ crm_order_id: orderId, crm_order_number: orderNumber, crm_customer_id: customerId, crm_synced_at: new Date().toISOString(), crm_synced_by: by.agentId })
      .eq("id", contract.id);

    await admin.from("contract_events").insert({
      contract_id: contract.id,
      event_type: "crm_synced",
      ip: by.ip ?? null,
      user_agent: by.userAgent ?? null,
      meta: { crm_order_id: orderId, crm_order_number: orderNumber, crm_customer_id: customerId, by: by.agentId, paid },
    });

    return { orderId, orderNumber, customerId, alreadySynced: false };
  } catch (error) {
    await release();
    throw error;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

type Crm = ReturnType<typeof createCrmClient>;
type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Find the customer by tax id, then by phone; create one when nothing matches. */
async function ensureCustomer(crm: Crm, contract: ContractRow, quote: QuoteRow, agentName: string | null): Promise<string> {
  const taxId = (contract.customer_tax_id ?? "").replace(/\D/g, "") || null;
  const phone = phoneDigits(contract.contact_phone) ?? phoneDigits(contract.business_phone) ?? phoneDigits(quote.customer_phone);

  if (taxId) {
    const { data } = await crm.from("customers").select("id").eq("tax_id", taxId).is("deleted_at", null).limit(1).maybeSingle();
    if (data) return String((data as { id: string }).id);
  }
  if (phone) {
    const { data } = await crm.from("customers").select("id").eq("mobile_phone", phone).is("deleted_at", null).limit(1).maybeSingle();
    if (data) return String((data as { id: string }).id);
  }

  const contact = splitName(contract.contact_name ?? quote.customer_contact);
  const { data, error } = await crm
    .from("customers")
    .insert({
      business_name: contract.customer_name,
      invoice_name: contract.customer_name,
      tax_id: taxId,
      address: contract.customer_address,
      mobile_phone: phone,
      business_phone: phoneDigits(contract.business_phone),
      email: contract.customer_email,
      first_name: contact.first,
      last_name: contact.last,
      pos_company: contract.pos_company,
      status_id: CRM.customerStatus.onboarding,
      has_signed_agreement: true,
      agreement_signed_at: contract.signed_at,
      agreement_status: "signed",
      notes: `נוצר אוטומטית מהסכם ${contract.contract_number} באתר ezorders.com${agentName ? ` · סוכן: ${agentName}` : ""}`,
    })
    .select("id")
    .single();
  if (error || !data) throw new CrmSyncError(`ה-CRM סירב ליצור לקוח: ${error?.message ?? "unknown"}`);
  return String((data as { id: string }).id);
}

/**
 * The CRM product that stands for a website product key. Looked up in our
 * map, then by SKU in the CRM, and created there if neither knows it — so the
 * catalogues never have to be paired by hand.
 */
async function ensureProduct(
  admin: Admin,
  crm: Crm,
  line: { key: string; label: string; setupUnit: number; monthlyUnit: number; group: string }
): Promise<string> {
  const sku = `${CRM.skuPrefix}${line.key}`;

  const { data: mapped } = await admin.from("crm_product_map").select("crm_product_id").eq("key", line.key).maybeSingle();
  if (mapped) return String((mapped as { crm_product_id: string }).crm_product_id);

  const { data: bySku } = await crm.from("products").select("id").eq("sku", sku).limit(1).maybeSingle();
  let id = bySku ? String((bySku as { id: string }).id) : null;

  if (!id) {
    const { data, error } = await crm
      .from("products")
      .insert({
        name: line.label,
        sku,
        description: `מוצר מקטלוג ezorders.com (${line.key}). נוצר אוטומטית בהעברת הסכם ל-CRM.`,
        price: line.setupUnit,
        setup_fee_value: line.setupUnit,
        has_monthly_payment: line.monthlyUnit > 0,
        monthly_price: line.monthlyUnit,
        monthly_payment_value: line.monthlyUnit,
        requires_installation_details: line.group === "hardware",
        show_installation_notes: line.group === "hardware",
        eligible_for_discount: line.group !== "hardware",
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !data) throw new CrmSyncError(`ה-CRM סירב ליצור מוצר "${line.label}": ${error?.message ?? "unknown"}`);
    id = String((data as { id: string }).id);
  }

  await admin.from("crm_product_map").upsert({ key: line.key, crm_product_id: id, crm_sku: sku }, { onConflict: "key" });
  return id;
}
