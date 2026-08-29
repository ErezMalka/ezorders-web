import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { CommissionCalculator } from "@/components/funnels/CommissionCalculator";
import { RelatedLinks } from "@/components/sections/RelatedLinks";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "מחשבון: כמה עולות לכם עמלות המשלוחים? | EZOrders",
  description:
    "בדקו כמה אתם משלמים בעמלות לוולט, לתן ביס ולסיבוס — וכמה מזה חוזר אליכם כשלקוחות חוזרים מזמינים ישירות מהאתר שלכם. מחשבון חינם למסעדות.",
  alternates: {
    canonical: "./",
    // Hebrew only: the commission rates and the platforms are Israeli.
    languages: { he: "/he/commission-calculator", "x-default": "/he/commission-calculator" },
  },
};

export default function CommissionCalculatorPage() {
  return (
    <PageLayout locale="he">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema("he", { name: "מחשבון עמלות", path: "/commission-calculator" }),
          ),
        }}
      />
      <section className="pb-16 pt-28">
        <div className="mx-auto max-w-container px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-brand-pinkInk">
              מחשבון חינם למסעדות
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-brand-dark md:text-4xl">
              כמה עולות לכם עמלות המשלוחים בשנה?
            </h1>
            <p className="mt-4 text-lg text-brand-muted">
              רבע עד שליש מכל הזמנה דרך פלטפורמה הולך לעמלה. הזיזו ארבעה סליידרים
              וראו את המספר השנתי — ואת החלק ממנו שבאמת חוזר אליכם.
            </p>
          </div>
          <CommissionCalculator />
        </div>
      </section>

      <RelatedLinks
        locale="he"
        items={[
          {
            href: "/he/restaurant-ordering-website",
            title: "אתר הזמנות משלכם",
            body: "הערוץ שבו אין עמלה לאף אחד. אותו תפריט, אותה קופה, ההזמנה נוחתת באותו מסך מטבח.",
          },
          {
            href: "/he/integrations",
            title: "החיבור לוולט, תן ביס וסיבוס",
            body: "הפלטפורמות לא הולכות לשום מקום, והן מביאות לקוחות חדשים. כך הן מתחברות לאותה מערכת.",
          },
          {
            href: "/he/restaurant-ordering-app",
            title: "אפליקציה ממותגת ללקוחות החוזרים",
            body: "הדרך להחזיר את הלקוחות שכבר מכירים אתכם לערוץ ישיר — הנחת הצטרפות, היסטוריה והזמנה חוזרת בלחיצה.",
          },
        ]}
      />
    </PageLayout>
  );
}
