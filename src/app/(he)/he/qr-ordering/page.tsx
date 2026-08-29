import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { FaqSection } from "@/components/sections/FaqSection";
import { GENERAL_FAQ } from "@/data/faq";
import { breadcrumbSchema } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "הזמנה בסריקת QR מהשולחן — בלי אפליקציה ובלי המתנה | EZOrders",
  description:
    "תפריט QR למסעדה: הסועדים סורקים קוד בשולחן, מזמינים ומשלמים מהטלפון — בלי אפליקציה, בלי המתנה למלצר. יותר הזמנות, פחות עומס על הצוות.",
  alternates: {
    canonical: "./", languages: { he: "/he/qr-ordering", "x-default": "/he/qr-ordering" } },
};

const sectionStyle = { padding: "8rem 1.5rem 4rem", maxWidth: "56rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#D22F63", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "2rem" } as const;
const h2Style = { fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.5rem" } as const;
const introStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.75rem" } as const;
const h3Style = { fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" } as const;
const bodyStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } as const;
const imgStyle = { width: "100%", height: "auto", borderRadius: "1rem", marginBottom: "2.5rem" } as const;
const linkStyle = { color: "#D22F63", textDecoration: "none", fontWeight: 600 } as const;
const ctaWrapStyle = { marginTop: "3rem" } as const;
const ctaStyle = { display: "inline-block", background: "#D22F63", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;

export default function HeQrOrderingPage() {
  return (
    <PageLayout locale="he">
      <section style={sectionStyle}>
        <span style={tagStyle}>הזמנה מהשולחן</span>
        <h1 style={h1Style}>סורקים, מזמינים, נהנים — הזמנה ב-QR ישר מהשולחן</h1>
        <p style={leadStyle}>
          מעמד קטן עם קוד QR על השולחן הופך כל טלפון לתחנת הזמנה. הסועדים מעיינים בתפריט המלא עם תמונות,
          מוסיפים לסל, משלמים — והמנה כבר בדרך למטבח. בלי להוריד אפליקציה, בלי לנופף למלצר, ובלי תור בקופה.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-mobile-ordering-app.webp" width={1024} height={1024}
          alt="הזמנה בסריקת QR במסעדה — טלפון עם תפריט דיגיטלי של EZOrders ליד מעמד QR על שולחן ערוך"
          style={imgStyle}
          loading="lazy"
        />

        <h2 style={h2Style}>איך זה עובד</h2>
        <p style={introStyle}>
          שלושה צעדים פשוטים שהופכים את חוויית ההזמנה — בלי לשנות דבר במטבח שלכם.
        </p>

        <h3 style={h3Style}>1. סורקים את הקוד</h3>
        <p style={bodyStyle}>
          לכל שולחן מוצמד קוד QR ייחודי. סריקה במצלמת הטלפון פותחת מיד את
          ה<a href="/he/digital-menus" style={linkStyle}>תפריט הדיגיטלי</a> — המערכת כבר יודעת מאיזה שולחן מזמינים.
        </p>

        <h3 style={h3Style}>2. מזמינים יחד, כל אחד מהטלפון שלו</h3>
        <p style={bodyStyle}>
          כל סועד בוחר בקצב שלו, עם תמונות, תיאורים וסימוני אלרגנים. ההזמנות מתאחדות לשולחן אחד,
          ואפשר לפצל את החשבון בסוף — בלי חשבונות על מפיות.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-qr-table-ordering.webp" width={1024} height={1024}
          alt="חבורת חברים במסעדה מזמינה מהטלפונים באמצעות מעמד QR ו-NFC על השולחן"
          style={imgStyle}
          loading="lazy"
        />

        <h3 style={h3Style}>3. ההזמנה זורמת ישר למטבח</h3>
        <p style={bodyStyle}>
          ברגע האישור ההזמנה מופיעה ב<a href="/he/kitchen-display" style={linkStyle}>מסך המטבח</a> וב<a href="/he/pos" style={linkStyle}>קופה</a> — בלי תיווך, בלי טעויות הקלדה, עם חותמת זמן לכל מנה.
        </p>

        <h2 style={h2Style}>למה מסעדות עוברות להזמנה ב-QR</h2>

        <h3 style={h3Style}>הסל הממוצע עולה</h3>
        <p style={bodyStyle}>
          כשההזמנה נגישה כל הארוחה, קל להוסיף עוד שתייה, תוספת או קינוח ברגע החשק — בלי לחכות שמישהו
          יעבור ליד השולחן. מסעדות מדווחות על עלייה עקבית בהזמנות המשך.
        </p>

        <h3 style={h3Style}>הצוות מתפנה לשירות</h3>
        <p style={bodyStyle}>
          פחות קבלת הזמנות וריצות לקופה, יותר אירוח. במשמרות עמוסות זה ההבדל בין צוות שכבוי לצוות שמארח.
        </p>

        <h3 style={h3Style}>פחות טעויות, פחות ביטולים</h3>
        <p style={bodyStyle}>
          הסועד מקליד בעצמו בדיוק מה שהוא רוצה, כולל הערות למטבח. מה שהוזמן זה מה שמגיע.
        </p>

        <div style={ctaWrapStyle}>
          <a href="/he/contact" style={ctaStyle}>רוצים QR על השולחנות? דברו איתנו</a>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema("he", { name: "הזמנה בסריקת QR", path: "/qr-ordering" })) }}
      />
      <FaqSection items={GENERAL_FAQ.he} locale="he" />
    </PageLayout>
  );
}
