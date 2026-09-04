import type { Metadata } from "next";
import { ConnectedRestaurant } from "@/components/sections/ConnectedRestaurant";

export const metadata: Metadata = {
  title: "המסעדה שלך. מחוברת. | EZOrders",
  description: "תצוגה מקדימה של רכיב החתימה של EZOrders.",
  // Hebrew content on a locale-less path, so it has no counterpart to point at
  // — canonical only, no hreflang.
  alternates: { canonical: "./" },
  // A component preview, by its own description, and it renders without
  // PageLayout — no header, no footer, no way onward. Nothing on the site links
  // to it, and Search Console already listed it under "Discovered - currently
  // not indexed". Offering it to searchers would only produce a dead end, so it
  // is marked as what it is. The URL still works for anyone holding the link.
  robots: { index: false, follow: false },
};

export default function ConnectedPreviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <ConnectedRestaurant />
    </main>
  );
}
