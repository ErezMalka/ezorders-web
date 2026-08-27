import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "מסך מטבח דיגיטלי KDS — כל ההזמנות במסך אחד | EZOrders",
  description:
    "מסך מטבח KDS למסעדות: כל ההזמנות מכל הערוצים על מסך אחד במטבח, עם זמני הכנה, סטטוסים ולוח מוכנות ללקוחות. נגמר עידן הבונים המודפסים.",
  alternates: {
    canonical: "./", languages: { he: "/he/kitchen-display", "x-default": "/he/kitchen-display" } },
};

const sectionStyle = { padding: "8rem 1.5rem 4rem", maxWidth: "56rem", margin: "0 auto" } as const;
const tagStyle = { display: "inline-block", color: "#e5306f", fontWeight: 600, marginBottom: "1rem" } as const;
const h1Style = { fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "1.25rem" } as const;
const leadStyle = { color: "#555", lineHeight: 1.9, fontSize: "1.125rem", marginBottom: "2rem" } as const;
const h2Style = { fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.5rem" } as const;
const introStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.75rem" } as const;
const h3Style = { fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" } as const;
const bodyStyle = { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } as const;
const imgStyle = { width: "100%", height: "auto", borderRadius: "1rem", marginBottom: "2.5rem" } as const;
const linkStyle = { color: "#e5306f", textDecoration: "none", fontWeight: 600 } as const;
const ctaWrapStyle = { marginTop: "3rem" } as const;
const ctaStyle = { display: "inline-block", background: "#e5306f", color: "#fff", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none" } as const;

export default function HeKitchenDisplayPage() {
  return (
    <PageLayout locale="he">
      <section style={sectionStyle}>
        <span style={tagStyle}>מסך מטבח דיגיטלי</span>
        <h1 style={h1Style}>מטבח שרואה הכל: מסך KDS במקום בונים מודפסים</h1>
        <p style={leadStyle}>
          במטבח עמוס, פתקים שנופלים ובונים שנמרחים עולים בהזמנות שגויות ובזמני המתנה. מסך המטבח של
          EZOrders מרכז את כל ההזמנות — מהשולחנות, מהקיוסק, מהאתר ומהמשלוחים — על מסך אחד ברור,
          עם טיימר לכל הזמנה וסטטוס לכל מנה.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-kitchen-display-kds.webp"
          alt="מסך מטבח KDS של EZOrders במטבח מסעדה — שף מסמן מנה כמוכנה על כרטיס הזמנה במסך מגע"
          style={imgStyle}
          loading="lazy"
        />

        <h2 style={h2Style}>מה מסך המטבח נותן לכם</h2>
        <p style={introStyle}>
          פחות רעש, יותר קצב. כל תחנה במטבח יודעת בדיוק מה עליה להכין ומתי.
        </p>

        <h3 style={h3Style}>כל הערוצים בתור אחד</h3>
        <p style={bodyStyle}>
          הזמנת <a href="/he/qr-ordering" style={linkStyle}>QR מהשולחן</a>, הזמנה מהקיוסק והזמנת משלוח
          נכנסות לאותו תור לפי סדר וזמן יעד. המטבח מפסיק ללהטט בין מדפסות ומסכים שונים.
        </p>

        <h3 style={h3Style}>טיימרים והתראות חכמות</h3>
        <p style={bodyStyle}>
          כל כרטיס הזמנה מציג כמה זמן עבר ומה זמן היעד. הזמנה שמתעכבת מודגשת אוטומטית —
          כך ששום שולחן לא נשכח, גם בשיא העומס של שישי בערב.
        </p>

        <h3 style={h3Style}>לוח מוכנות ללקוחות</h3>
        <p style={bodyStyle}>
          בסימון «מוכן» במטבח, מספר ההזמנה קופץ ללוח הסטטוס באזור האיסוף. הלקוחות רואים בדיוק מתי
          לגשת לדלפק — בלי צעקות שמות ובלי התגודדות.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-order-status-board.webp"
          alt="לוח סטטוס הזמנות של EZOrders במסעדה — מסך המציג הזמנות בהכנה ומוכנות לאיסוף"
          style={imgStyle}
          loading="lazy"
        />

        <h2 style={h2Style}>שאלות נפוצות על מסך מטבח</h2>

        <h3 style={h3Style}>האם צריך חומרה מיוחדת?</h3>
        <p style={bodyStyle}>
          לא. המערכת רצה על כל מסך מגע או טאבלט עמיד למטבח. אנחנו נמליץ על תצורה לפי גודל המטבח
          ומספר התחנות — ממסך אחד ועד מסך לכל תחנת הכנה.
        </p>

        <h3 style={h3Style}>מה קורה אם האינטרנט נופל?</h3>
        <p style={bodyStyle}>
          ההזמנות שכבר נקלטו נשמרות מקומית וממשיכות להופיע על המסך. ברגע שהחיבור חוזר, הכל מסתנכרן
          אוטומטית מול <a href="/he/pos" style={linkStyle}>הקופה</a> והדוחות.
        </p>

        <h3 style={h3Style}>האם אפשר לחלק הזמנות בין תחנות?</h3>
        <p style={bodyStyle}>
          כן — מנות מתפצלות אוטומטית לפי תחנה (גריל, סלטים, בר), וכרטיס ההזמנה המרכזי מתעדכן כשכל
          התחנות סיימו. ההגשה יוצאת שלמה וחמה.
        </p>

        <div style={ctaWrapStyle}>
          <a href="/he/contact" style={ctaStyle}>לתיאום הדגמה במטבח שלכם</a>
        </div>
      </section>
    </PageLayout>
  );
}
