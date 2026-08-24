import type { QuoteStatus } from "./quotes";
import type { OrderStatus } from "./orders";

/** Hebrew label and badge styling for each lifecycle state. */
export const QUOTE_STATUS: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-slate-100 text-slate-600" },
  sent: { label: "נשלחה", className: "bg-indigo-50 text-brand-indigo" },
  viewed: { label: "נצפתה", className: "bg-amber-50 text-amber-700" },
  accepted: { label: "אושרה", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "נדחתה", className: "bg-red-50 text-red-700" },
  expired: { label: "פג תוקף", className: "bg-slate-100 text-slate-500" },
};

/**
 * The delivery track. The labels are what an agent would say on the telephone,
 * because that is where they get read out.
 */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; className: string; next?: OrderStatus; nextLabel?: string }
> = {
  pending_setup: {
    label: "ממתינה להקמה",
    className: "bg-amber-50 text-amber-700",
    next: "in_setup",
    nextLabel: "התחלת הקמה",
  },
  in_setup: {
    label: "בהקמה",
    className: "bg-indigo-50 text-brand-indigo",
    next: "live",
    nextLabel: "סימון כפעיל",
  },
  live: { label: "פעיל", className: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "בוטלה", className: "bg-red-50 text-red-700" },
};

/** Quotes still waiting on the customer — what the pipeline figure counts. */
export const OPEN_STATUSES: QuoteStatus[] = ["draft", "sent", "viewed"];

/** Orders we still owe the customer something on. */
export const OPEN_ORDER_STATUSES: OrderStatus[] = ["pending_setup", "in_setup"];

export const heDate = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const heDateTime = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
