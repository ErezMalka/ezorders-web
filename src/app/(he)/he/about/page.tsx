import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { ModuleIcon, type IconName } from "@/components/Icons";
import { AdminScreens } from "@/components/sections/AdminScreens";
import { ContactBand } from "@/components/sections/ContactBand";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "אודות EZOrders — המערכת החכמה ביותר לענף המזון המהיר",
  description:
    "מאז 2016 אנחנו בונים למסעדות ולרשתות מזון מהיר מערכת אחת: קופה, קיוסק, אתר ואפליקציית הזמנות, מסך מטבח, מועדון לקוחות וחיבור לוולט, תן ביס וסיבוס — הכול על תפריט אחד ודוח אחד.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en/about",
      he: "/he/about",
      "x-default": "/he/about",
    },
  },
};

/**
 * The about page used to say "mission" and "vision" in two grey paragraphs.
 * Nobody chooses a system for a restaurant on a mission statement; they choose
 * it because, at 13:10 on a Thursday, the orders from Wolt, the kiosk and the
 * counter land on the same screen and the day adds up in one report. So the
 * page argues that case with the product itself — the channels, the mechanism,
 * real captures of the panel — and states only figures that are true.
 */

const CHANNELS: { icon: IconName; title: string; body: string; href: string }[] = [
  { icon: "pos", title: "קופה", body: "קופה למסעדה עם מגירה, משמרות, פיצול חשבון ודוחות X ו-Z.", href: "/he/pos" },
  { icon: "kiosk", title: "עמדת קיוסק", body: "הלקוח מזמין ומשלם לבד. התור מתקצר, הסל הממוצע גדל.", href: "/he/kiosk-stands" },
  { icon: "web", title: "אתר הזמנות", body: "איסוף, משלוח או ישיבה במקום — בלי עמלות פלטפורמה.", href: "/he/restaurant-ordering-website" },
  { icon: "orders", title: "אפליקציה ממותגת", body: "האפליקציה שלכם בחנויות, עם מועדון והתראות.", href: "/he/restaurant-ordering-app" },
  { icon: "menu", title: "מסך מטבח (KDS)", body: "כל הזמנה, מכל ערוץ, באותו תור הכנה.", href: "/he/kitchen-display" },
  { icon: "loyalty", title: "מועדון וארנק", body: "נקודות, קופונים, EzWallet — הלקוח חוזר, ואתם יודעים למה.", href: "/he/platform" },
];

const PILLARS: { eyebrow: string; title: string; body: string; image: string; alt: string; points: string[] }[] = [
  {
    eyebrow: "ערוץ אחד במקום שישה",
    title: "וולט, תן ביס, סיבוס, הקיוסק והדלפק — מסך אחד, דוח אחד",
    body: "מסעדה ישראלית מקבלת היום הזמנות מחמישה-שישה מקומות. בלי חיבור אמיתי כל אחד מגיע בטאבלט משלו, נרשם בנפרד ומסתכם בנפרד. אצלנו כולם נכנסים לאותה קופה, לאותו מסך מטבח ולאותו דוח סוף יום.",
    image: "/images/ai/ezorders-kitchen-display-kds.webp",
    alt: "מסך מטבח שמציג הזמנות מכמה ערוצים באותו תור",
    points: ["וולט, תן ביס, משלוחה, HAAT — כהזמנות", "סיבוס ותן ביס — כאמצעי תשלום, נסגר מול הקופה", "אפס טאבלטים על השיש"],
  },
  {
    eyebrow: "תפריט אחד",
    title: "שיניתם מחיר? הוא השתנה בקופה, בקיוסק, באתר ובאפליקציה — באותה שנייה",
    body: "התפריט הוא ישות אחת. פריט שנגמר יורד מכל הערוצים, מבצע שהתחיל מופיע בכולם, ותוספת שהוספתם למנה נמכרת בכל מקום שבו המנה נמכרת. אין הדפסה מחדש ואין ״תעדכן גם באפליקציה״.",
    image: "/images/ai/ezorders-mobile-ordering-app.webp",
    alt: "תפריט דיגיטלי בטלפון",
    points: ["מערכת תוספות ומשדרגי ארוחה", "הזמנה עתידית חכמה וריבוי שפות", "זמינות לפי שעה, מלאי וסניף"],
  },
  {
    eyebrow: "מנגנוני מכירה",
    title: "המערכת לא רק רושמת הזמנות. היא מגדילה אותן",
    body: "קופונים, 1+1, שדרוג לארוחה, Upsale בקופה ובקיוסק, מועדון לקוחות עם נקודות ובונוסים, ארנק דיגיטלי. כל אחד מהם הוא כפתור בפאנל, לא פרויקט.",
    image: "/images/ai/ezorders-contactless-payment.webp",
    alt: "תשלום ללא מגע בעמדת קופה",
    points: ["קופונים, 1+1, שדרוג לארוחה", "מועדון לקוחות ו-EzWallet", "Bit, Apple Pay, Google Pay, סיבוס ותן ביס"],
  },
  {
    eyebrow: "הנתונים אצלכם",
    title: "בסוף היום יש מספר אחד, ואתם רואים איך הגעתם אליו",
    body: "פדיון לפי ערוץ, לפי סניף, לפי שעה ולפי פריט. מי מהשליחים בדרך, איזו קופה פתוחה, ואיזה מבצע באמת עבד. בפאנל אחד, גם מהטלפון.",
    image: "/images/ai/ezorders-analytics-dashboard.webp",
    alt: "דשבורד אנליטיקה של מסעדה",
    points: ["דוחות מכירות, זיכויים וחשבוניות", "ניהול רשת: סניפים, עובדים, נוכחות", "אחסון מאובטח ב-Amazon, אימות כתובות עם Google Maps"],
  },
];

const FACTS: { value: string; label: string }[] = [
  { value: "2016", label: "השנה שבה התחלנו לבנות את זה" },
  { value: "1", label: "תפריט, דוח וקופה לכל הערוצים" },
  { value: "6+", label: "פלטפורמות משלוחים ושוברים מחוברות" },
  { value: "0", label: "טאבלטים נפרדים על השיש" },
];

const STEPS: { title: string; body: string }[] = [
  { title: "שיחה קצרה", body: "מה יש לכם היום, מה תוקע אתכם, ומה הסניף צריך. חצי שעה." },
  { title: "בניית התפריט", body: "אנחנו מקימים את התפריט, כולל תוספות, מבצעים ומק״טים. אתם מאשרים." },
  { title: "התקנה וחיבורים", body: "קופה, קיוסק, מסך מטבח, וולט ותן ביס — מותקנים ומחוברים במקום." },
  { title: "עולים לאוויר, ונשארים", body: "ליווי בימים הראשונים, ותמיכה אחר כך. המערכת גדלה עם הסניף הבא." },
];

export default function HeAboutPage() {
  return (
    <PageLayout locale="he">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema("he", { name: "אודות", path: "/about" })),
        }}
      />

      {/* HERO. Light, like every other page: the header is transparent at the
          top of the page with dark text, so a dark hero would hide the nav. */}
      <section className="bg-brand-grey pb-20 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pinkInk">
              אודות EZOrders
            </span>
            <h1 className="text-4xl font-bold leading-tight text-brand-dark md:text-6xl">
              המערכת החכמה ביותר
              <br />
              <span className="text-brand-pinkInk">לענף המזון המהיר</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-brand-muted md:text-xl">
              קופה, קיוסק, אתר, אפליקציה, מסך מטבח ומועדון לקוחות — מערכת אחת, תפריט אחד, דוח אחד.
              מחוברת לוולט, לתן ביס ולסיבוס. בנויה בישראל, למסעדות בישראל, מאז 2016.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <CTAButton href="/he/contact">קבעו דמו</CTAButton>
              <Link
                href="/he/price"
                className="inline-block rounded-pill border border-brand-indigo px-9 py-3.5 font-medium text-brand-indigo transition hover:bg-brand-indigo hover:text-white"
              >
                בנו את החבילה שלכם
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-card shadow-2xl ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ai/ezorders-hero-restaurant-scene.webp"
              alt="מסעדת מזון מהיר עם עמדת קיוסק, קופה ומסכי מטבח של EZOrders"
              className="block h-auto w-full"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* FACTS */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-container grid-cols-2 divide-slate-200 px-6 md:grid-cols-4 md:divide-x md:divide-x-reverse">
          {FACTS.map((f) => (
            <div key={f.label} className="px-4 py-8 text-center">
              <p className="text-4xl font-bold text-brand-indigo md:text-5xl">{f.value}</p>
              <p className="mt-2 text-sm text-brand-muted">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ONE SYSTEM */}
      <section className="mx-auto max-w-container px-6 py-20">
        <p className="mb-2 text-sm font-medium text-brand-pinkInk">מה זה בעצם</p>
        <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          לא שש מערכות שמדברות. מערכת אחת.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-brand-muted">
          כל ערוץ שבו הלקוח מזמין — והכול נכנס לאותו תפריט, אותה קופה ואותו דוח. תבחרו רק מה שהסניף צריך היום;
          השאר נדלק כשתצטרכו.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-card border border-slate-200 bg-white p-7 transition hover:-translate-y-0.5 hover:border-brand-pink/50 hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint">
                <ModuleIcon name={c.icon} className="h-7 w-7 text-brand-indigo" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-brand-dark group-hover:text-brand-pinkInk">{c.title}</h3>
              <p className="mt-2 text-brand-muted">{c.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY SMARTEST */}
      <section className="bg-brand-grey py-20">
        <div className="mx-auto max-w-container px-6">
          <p className="mb-2 text-sm font-medium text-brand-pinkInk">למה ״הכי חכמה״</p>
          <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            ארבעה דברים שמערכת למזון מהיר חייבת לעשות, וכמעט אף אחת לא עושה את כולם
          </h2>
          <div className="mt-14 space-y-20">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <p className="mb-2 text-sm font-medium text-brand-pinkInk">{p.eyebrow}</p>
                  <h3 className="text-2xl font-bold leading-snug text-brand-dark md:text-3xl">{p.title}</h3>
                  <p className="mt-4 text-lg text-brand-muted">{p.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3 text-brand-dark">
                        <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand-pink" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="overflow-hidden rounded-card shadow-xl ring-1 ring-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.alt} loading="lazy" decoding="async" className="block h-auto w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE REAL PANEL */}
      <AdminScreens
        locale="he"
        keys={["home", "branch", "pos", "orders", "report"]}
        eyebrow="לא מצגת. המערכת."
        heading="ככה זה נראה מהטלפון של בעל הסניף"
        lead="צילומים מפאנל הניהול של EZOrders: הבית, דשבורד הסניף, הקופה, ההזמנות החיות ודוח סוף היום. אותו פאנל שולט בכל הערוצים."
      />

      {/* HOW WE WORK */}
      <section className="mx-auto max-w-container px-6 py-20">
        <p className="mb-2 text-sm font-medium text-brand-pinkInk">איך זה עובד איתנו</p>
        <h2 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
          מהשיחה הראשונה עד ההזמנה הראשונה
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-card bg-brand-grey p-7">
              <span className="text-5xl font-bold text-brand-pink/40">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-xl font-bold text-brand-dark">{s.title}</h3>
              <p className="mt-2 text-brand-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <CTAButton href="/he/contact">בואו נדבר על הסניף שלכם</CTAButton>
          <WhatsAppButton locale="he" />
        </div>
      </section>

      <ContactBand locale="he" />
    </PageLayout>
  );
}
