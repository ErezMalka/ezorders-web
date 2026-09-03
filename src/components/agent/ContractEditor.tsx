"use client";

import { useState } from "react";

import { ContractActions } from "@/components/agent/ContractActions";
import { ContractNotes } from "@/components/agent/ContractNotes";
import type { ContractLineRow, ContractStatus } from "@/lib/agent/contracts";

/**
 * The notes and the send button, in that order, sharing one piece of state.
 *
 * They were two independent blocks and the send button came first, which is how
 * six contracts in a row went out with `notes` null: an agent lands here from
 * the quote, the first control under their thumb is "שליחה ללקוח", and the
 * notes form is two sections further down the page. The order was the bug.
 *
 * Now the notes come first, and the button knows what the form is holding — it
 * will not fire over text that has not been saved, because unsaved text is not
 * in the document, and the document is the only thing the customer ever sees.
 */
export function ContractEditor({
  id,
  status,
  token,
  siteUrl,
  lines,
  initialNotes,
  initialItemNotes,
  quoteNotes,
}: {
  id: string;
  status: ContractStatus;
  token: string;
  siteUrl: string;
  lines: ContractLineRow[];
  initialNotes: string;
  initialItemNotes: Record<string, string>;
  quoteNotes: string | null;
}) {
  const locked = status === "signed" || status === "cancelled";

  const [dirty, setDirty] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);

  const notesBlock = (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-brand-dark">הערות</h2>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-brand-muted">
        הערה לכל שורה, והערות כלליות לכל ההסכם. שתיהן מודפסות בתוך ההסכם שהלקוח חותם עליו
        ונכללות בטביעת המסמך.
      </p>
      <ContractNotes
        id={id}
        status={status}
        lines={lines}
        initialNotes={initialNotes}
        initialItemNotes={initialItemNotes}
        quoteNotes={quoteNotes}
        onDirtyChange={setDirty}
        onNotesPresenceChange={setHasNotes}
      />
    </section>
  );

  const actionsBlock = (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
      <ContractActions
        id={id}
        status={status}
        token={token}
        siteUrl={siteUrl}
        blockedReason={
          dirty ? "יש הערות שנכתבו ולא נשמרו. שמרו אותן — אחרת הן לא יופיעו במסמך." : null
        }
        notesAreEmpty={!hasNotes}
      />
    </section>
  );

  // Nothing to fill in once it is signed or cancelled, so the actions lead and
  // the notes read as a record of what was agreed.
  return locked ? (
    <>
      {actionsBlock}
      {notesBlock}
    </>
  ) : (
    <>
      {notesBlock}
      {actionsBlock}
    </>
  );
}
