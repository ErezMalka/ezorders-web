import type { Metadata } from "next";
import { ConnectedRestaurant } from "@/components/sections/ConnectedRestaurant";

export const metadata: Metadata = {
  title: "המסעדה שלך. מחוברת. | EZOrders",
  description: "תצוגה מקדימה של רכיב החתימה של EZOrders.",
};

export default function ConnectedPreviewPage() {
  return (
    <main className="min-h-screen bg-white">
      <ConnectedRestaurant />
    </main>
  );
}
