import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";
import { ContactForm } from "@/components/ContactForm";

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
  const intro = createElement(
    "div",
    null,
    createElement(
      "h1",
      { style: { fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" } },
      "צור קשר"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "1.5rem" } },
      "רוצים לשמוע עוד? נשמח להכיר את המסעדה שלכם ולהראות לכם איך EZOrders יכולה להגדיל מכירות ולהקל על השירות. השאירו פרטים ונחזור אליכם בהקדם."
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "0.5rem" } },
      createElement("strong", null, "טלפון: "),
      createElement(
        "a",
        { href: "tel:*4958", style: { color: "#e6007e", textDecoration: "none" } },
        "*4958"
        )
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8 } },
      createElement("strong", null, "אימייל: "),
      createElement(
        "a",
        { href: "mailto:contact@ezorders.com", style: { color: "#e6007e", textDecoration: "none" } },
        "contact@ezorders.com"
        )
      )
    );

const formCard = createElement(
  "div",
  { className: "rounded-card bg-brand-indigo p-8 md:p-12" },
  createElement(ContactForm, { locale: "he" })
  );

const content = createElement(
  "section",
  { className: "pb-20 pt-36" },
  createElement(
    "div",
    { className: "mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2" },
    intro,
    formCard
    )
  );

return createElement(PageLayout, { locale: "he" }, content);
}
