import type { Metadata } from "next";
import { ProductPageLayout } from "@/components/ProductPageLayout";
import { digitalMenusContent } from "@/data/products/digital-menus";

export const metadata: Metadata = {
  title: "תפריטים דיגיטליים - ezorders",
  description: "תפריט דיגיטלי למסעדה שמתעדכן בשניות, נראה מצוין בכל מכשיר ומגדיל את הסל הממוצע — עם QR לכל שולחן ותמיכה רב-לשונית.",
  alternates: { languages: { en: "/digital-menus", he: "/he/digital-menus", "x-default": "/digital-menus" } },
};

export default function HeDigitalMenusPage() {
  return <ProductPageLayout content={digitalMenusContent.he} locale="he" />;
}
