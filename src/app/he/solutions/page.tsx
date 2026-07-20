import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";
import { SIGNUP_URL } from "@/data/content";

export const metadata: Metadata = {
  title: "פתרונות - ezorders",
  description:
    "הפתרונות של EZOrders למסעדות: אתר הזמנות למסעדה, תפריטים דיגיטליים, עמדות קיוסק, אפליקציית הזמנות ומערכת ניהול הזמנות — הכל מסונכרן ומתעדכן בזמן אמת.",
  alternates: {
    languages: {
      en: "/solutions",
      he: "/he/solutions",
      "x-default": "/solutions",
    },
  },
};

const technologies = [
  { label: "תפריטים דיגיטליים", href: "/he/digital-menus" },
  { label: "אתרי הזמנות", href: "/he/restaurant-ordering-website" },
  { label: "מועדוני לקוחות", href: "/he/platform" },
  { label: "עמדות קיוסק", href: "/he/kiosk-stands" },
  { label: "אפליקציות", href: "/he/restaurant-ordering-app" },
  { label: "קופה (POS)", href: "/he/pos" },
  { label: "מערכת ניהול הזמנות", href: "/he/platform" },
];

export default function HeSolutionsPage() {
  return (
    <PageLayout locale="he">
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              פתרונות
            </span>
            <h1 className="text-5xl font-bold leading-tight md:text-6xl">
              <span className="text-brand-indigo">דיגיטציה</span> למסעדה שלכם, עם
              אינספור אפשרויות
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-muted">
              הגיע הזמן לצלול לטכנולוגיה החדשה שתאפשר לכם ליהנות מהעולם הדיגיטלי
              ומכל היתרונות שלו.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <CTAButton href={SIGNUP_URL}>התנסות חינם ל-14 יום</CTAButton>
              <CTAButton href="#technologies" variant="link">
                הטכנולוגיות שלנו
              </CTAButton>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-[420px] w-[420px] items-center justify-center rounded-full bg-brand-indigo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/solutions-chef.png"
                alt="שף מחזיק טלפון"
                className="max-h-[400px] w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* OUR SERVICES / TECHNOLOGIES */}
      <section id="technologies" className="mx-auto max-w-container px-6 py-20">
        <p className="mb-2 text-sm font-medium text-brand-pink">הטכנולוגיות שלנו</p>
        <h2 className="text-4xl font-bold md:text-5xl">השירותים שלנו</h2>
        <p className="mt-4 max-w-2xl text-brand-muted">
          ב-EZOrders אנחנו הופכים אופליין לאונליין. פתחו את עתיד תפעול המסעדה עם
          מערכת ההזמנות המתקדמת שלנו — תפריטים דיגיטליים אינטואיטיביים, פלטפורמות
          אונליין ידידותיות ועמדות קיוסק חדשניות.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div className="rounded-card bg-brand-grey p-8">
            <h3 className="mb-3 text-2xl font-semibold text-brand-indigo">
              מערכת ניהול מלאה
            </h3>
            <p className="text-brand-muted">
              מאחורי כל הפתרונות הפונים ללקוח עומדת פלטפורמת ניהול אחת — קופה,
              הזמנות, תפריט, מועדון לקוחות, שליחים, עובדים, דוחות וניהול רב-סניפי.
              הכל מחובר ומתעדכן בזמן אמת, כך שיש לכם שליטה מלאה על התפריט, המחירים
              והחוויה — מסניף בודד ועד רשת שלמה.
            </p>
          </div>
          <div className="grid content-start gap-3">
            {technologies.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="rounded-card border border-gray-200 px-6 py-4 font-medium transition hover:border-brand-indigo hover:text-brand-indigo"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Testimonials locale="he" />
      <ContactBand locale="he" />
    </PageLayout>
  );
}
