import type { Metadata } from "next";

import { AgentShell } from "@/components/agent/AgentShell";
import { ProductManager } from "@/components/agent/ProductManager";
import { listProducts } from "@/lib/agent/products";
import { requireAdminSession } from "@/lib/agent/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מחירון - ezorders",
  robots: { index: false, follow: false },
};

export default async function AgentProductsPage() {
  // Admins only. The database says the same thing — the write policy on
  // public.products checks is_admin() — so this redirect is about not showing
  // an agent a screen where every button would fail.
  const session = await requireAdminSession();
  const products = await listProducts();

  return (
    <AgentShell
      session={session}
      active="/he/agent/products"
      title="מחירון"
      lead="מה שנמכר, ובכמה. שינוי כאן משנה גם את המחשבון באתר וגם את בונה ההצעות"
    >
      <ProductManager products={products} />
    </AgentShell>
  );
}
