import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { ContactForm } from "@/components/ContactForm";
import { SIGNUP_URL } from "@/data/content";

export const metadata: Metadata = {
  title: "צור קשר - ezorders",
  description:
    "רוצים לשמוע עוד על EZOrders? צרו איתנו קשר ונשמח להראות לכם איך תפריטים דיגיטליים והזמנות אונליין יכולים לעזור למסעדה שלכם.",
  alternates: {
    languages: {
      en: "/contact",
      he: "/he/contact",
      "x-default": "/contact",
    },
  },
};

export default function HeContactPage() {
  return (
    <PageLayout locale="he">
      <section className="pb-20 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
          <div>
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pink">
              צור קשר
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              המומחים שלנו כאן לענות על כל שאלה
            </h1>
            <p className="mt-6 text-lg text-brand-muted">
              רוצים לשמוע עוד? נשמח להכיר את המסעדה שלכם ולהראות לכם איך EZOrders
              יכולה להגדיל מכירות ולהקל על השירות. השאירו פרטים ונחזור אליכם
              בהקדם.
            </p>
            <p className="mt-6 font-semibold">
              טלפון:{" "}
              <a href="tel:*4958" className="font-normal text-brand-pink underline">
                *4958
              </a>
            </p>
            <p className="mt-2 font-semibold">
              כבר לקוחות?{" "}
              <a
                href="mailto:support@ezorders.com"
                className="font-normal text-brand-pink underline"
              >
                support@ezorders.com
              </a>
            </p>
            <p className="mt-2 font-semibold">
              רוצים להתנסות ב-EZOrders?{" "}
              <a href={SIGNUP_URL} className="font-normal text-brand-pink underline">
                התחילו 14 יום ניסיון חינם.
              </a>
            </p>
          </div>
          <div className="rounded-card bg-brand-indigo p-8 md:p-12">
            <ContactForm locale="he" />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
