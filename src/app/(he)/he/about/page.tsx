import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { ContactBand } from "@/components/sections/ContactBand";
import { SIGNUP_URL } from "@/data/content";

export const metadata: Metadata = {
  title: "אודות EZOrders — מערכות הזמנה וניהול למסעדות בישראל",
  description:
    "הכירו את EZOrders — אנחנו בונים תפריטים דיגיטליים ומערכת הזמנות למסעדות, שמתעדכנים בשניות ומלווים את הלקוח בצורה חלקה מהעיון ועד ההזמנה.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/about",
      he: "/he/about",
      "x-default": "/he/about",
    },
  },
};

export default function HeAboutPage() {
  return (
    <PageLayout locale="he">
      {/* HERO */}
      <section className="bg-brand-grey pb-20 pt-36 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pinkInk">
            אודות
          </span>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            הכירו את <span className="text-brand-pink">EZ</span>
            <span className="text-brand-indigo">Orders.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-muted">
            EZOrders הופכת כל צפייה בתפריט לרגע של החלטה. אנחנו בונים תפריטים
            דיגיטליים מבוססי מובייל למסעדות, שמתעדכנים בשניות, נראים מצוין בכל
            מכשיר, ומלווים את הלקוחות בצורה חלקה מהעיון ועד ההזמנה — מגדילים את
            הסל הממוצע ומפחיתים עומס בשירות.
          </p>
        </div>
      </section>

      {/* MISSION + VISION */}
      <section className="mx-auto max-w-container px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold">המשימה שלנו</h2>
            <p className="text-brand-muted">
              לתת לבעלי מסעדות שליטה מלאה — גם בשיא העומס. EZOrders מציבה מחירים,
              זמינות ומבצעים במרחק הקלקה אחת, בטלפון, בטאבלט או בעמדת קיוסק, כך
              שתוכלו להגיב לביקוש בלי הדפסות מחדש ובלי המתנה לעיצוב. כרטיסי פריט
              ברורים עם תמונות ומידע שקוף מקצרים את ההתלבטות, ופעולות בלחיצה
              מגדילות תוספות ומזרזות את השירות.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-3xl font-bold">החזון שלנו</h2>
            <p className="text-brand-muted">
              תפריטים הופכים לחוויות דינמיות ומבוססות נתונים שמתאימות את עצמן
              לרגע — לשעה ביום, למלאי ולביקוש. אנחנו בונים לעבר המלצות חכמות יותר,
              כרטיסי פריט עשירים ואנליטיקה שמדגישה את מה שחשוב, בלי מורכבות —
              תפריט שמרגיש חי ושומר על מותג אחיד בכל הסניפים.
            </p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <CTAButton href={SIGNUP_URL}>התחילו עם EZOrders</CTAButton>
        </div>
      </section>

      <ContactBand locale="he" />
    </PageLayout>
  );
}
