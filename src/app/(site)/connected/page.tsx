import type { Metadata } from "next";
import { ConnectedRestaurant } from "@/components/sections/ConnectedRestaurant";

export const metadata: Metadata = {
  title: "המסעדה שלך. מחוברת. | EZOrders",
  description: "תצוגה מקדימה של רכיב החתימה של EZOrders.",
  // Hebrew content on a locale-less path, so it has no counterpart to point at
  // — canonical only, no hreflang.
  alternates: { canonical: "./" },
};

export default function ConnectedPreviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <ConnectedRestaurant />
    </main>
  );
}
