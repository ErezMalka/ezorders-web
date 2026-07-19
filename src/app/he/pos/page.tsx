import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "מערכת קופה למסעדות (POS) - ezorders",
  description:
    "מערכת POS למסעדות שמאחדת קופה, הזמנות אונליין, קיוסק ומשלוחים במסך אחד — סליקה מהירה, ניהול תפריט בזמן אמת ודוחות חכמים.",
  alternates: { languages: { he: "/he/pos", "x-default": "/he/pos" } },
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

export default function HePosPage() {
  return (
    <PageLayout locale="he">
      <section style={sectionStyle}>
        <span style={tagStyle}>מערכת קופה למסעדות</span>
        <h1 style={h1Style}>מערכת POS שמנהלת את כל המסעדה ממסך אחד</h1>
        <p style={leadStyle}>
          הקופה של EZOrders היא הרבה יותר מקופה: היא מרכז השליטה של המסעדה. כל הזמנה — מהדלפק, מהקיוסק,
          מהאתר או מהאפליקציה — נכנסת לאותו מסך, מסונכרנת עם המטבח ונרשמת בדוחות. פחות ריצות בין מערכות,
          פחות טעויות, ותמונה מלאה של העסק בכל רגע.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-pos-system.webp"
          alt="מערכת קופה POS למסעדה של EZOrders — מסך מגע עם תפריט מוצרים ולקוחה משלמת בטלפון"
          style={imgStyle}
          loading="lazy"
        />

        <h2 style={h2Style}>מה מקבלים עם הקופה של EZOrders</h2>
        <p style={introStyle}>
          מערכת קופה ממוחשבת שנבנתה למסעדות ישראליות — מהירה בשעות העומס, פשוטה לצוות חדש, ומחוברת לכל ערוצי המכירה.
        </p>

        <h3 style={h3Style}>כל הערוצים בקופה אחת</h3>
        <p style={bodyStyle}>
          ישיבה, טייק-אוויי ומשלוחים מנוהלים באותו ממשק. הזמנות מהאתר, מהקיוסק ומהאפליקציה זורמות ישירות
          לקופה ולמטבח — בלי הקלדה כפולה ובלי הזמנות שהולכות לאיבוד.
        </p>

        <h3 style={h3Style}>סליקה מהירה בכל אמצעי תשלום</h3>
        <p style={bodyStyle}>
          אשראי, ארנק דיגיטלי, תשלום ללא מגע או מזומן — הכל נסלק במקום, כולל פיצול חשבון בין סועדים.
          פחות זמן ליד הקופה, יותר תחלופה בשולחנות.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-contactless-payment.webp"
          alt="תשלום ללא מגע במסעדה — לקוחה מקרבת טלפון למסופון ליד עמדת הקופה"
          style={imgStyle}
          loading="lazy"
        />

        <h3 style={h3Style}>ניהול תפריט ומלאי בזמן אמת</h3>
        <p style={bodyStyle}>
          שינוי מחיר, סימון פריט כאזל או מבצע לשעות מסוימות — עדכון אחד בקופה מתעדכן מיד גם
          ב<a href="/he/digital-menus" style={linkStyle}>תפריט הדיגיטלי</a>, בקיוסק ובאתר ההזמנות.
        </p>

        <h3 style={h3Style}>דוחות שמספרים מה באמת קורה</h3>
        <p style={bodyStyle}>
          מכירות לפי שעה, מנות מובילות, ביצועי עובדים וממוצע הזמנה — הדשבורד מציג את הנתונים
          שחשובים להחלטות: מה למכור, מתי לתגבר צוות ואיפה הרווח מתחבא.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai/ezorders-analytics-dashboard.webp"
          alt="דשבורד ניהול ודוחות של EZOrders — גרפים של הכנסות ומנות מובילות על מסך מחשב"
          style={imgStyle}
          loading="lazy"
        />

        <h2 style={h2Style}>שאלות נפוצות על מערכת קופה למסעדה</h2>

        <h3 style={h3Style}>האם המערכת מתאימה גם לעסק קטן?</h3>
        <p style={bodyStyle}>
          כן. המערכת מודולרית — אפשר להתחיל עם קופה ותפריט דיגיטלי בלבד, ולהוסיף קיוסק, אתר הזמנות
          או אפליקציה כשהעסק גדל. משלמים רק על מה שמשתמשים בו.
        </p>

        <h3 style={h3Style}>כמה זמן לוקח להטמיע את הקופה?</h3>
        <p style={bodyStyle}>
          ברוב המסעדות ההקמה אורכת ימים בודדים: אנחנו טוענים את התפריט, מגדירים את המסופים ומדריכים את
          הצוות. הממשק אינטואיטיבי, כך שגם עובד חדש שולט בו תוך משמרת אחת.
        </p>

        <h3 style={h3Style}>האם הקופה עובדת יחד עם מסך המטבח?</h3>
        <p style={bodyStyle}>
          בוודאי — כל הזמנה שנקלטת בקופה מופיעה מיד ב<a href="/he/kitchen-display" style={linkStyle}>מסך המטבח (KDS)</a>,
          עם זמני הכנה וסטטוסים, כך שהמטבח והדלפק תמיד מסונכרנים.
        </p>

        <div style={ctaWrapStyle}>
          <a href="/he/contact" style={ctaStyle}>לתיאום הדגמה של המערכת</a>
        </div>
      </section>
    </PageLayout>
  );
}
