import type { Metadata } from "next";
import { createElement } from "react";
import { PageLayout } from "@/components/PageLayout";

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
  const content = createElement(
    "section",
    {
      style: {
        padding: "8rem 1.5rem 4rem",
        maxWidth: "48rem",
        margin: "0 auto",
      },
    },
    createElement(
      "h1",
      { style: { fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" } },
      "צור קשר"
      ),
    createElement(
      "p",
      { style: { color: "#555", lineHeight: 1.8, marginBottom: "2rem" } },
      "רוצים לשמוע עוד? נשמח להכיר את המסעדה שלכם ולהראות לכם איך EZOrders יכולה להגדיל מכירות ולהקל על השירות. השאירו פרטים או התקשרו אלינו ונחזור אליכם בהקדם."
      ),
    createElement(
      "h2",
      { style: { fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" } },
      "טלפון"
      ),
    createElement(
      "a",
      {
        href: "tel:1234567890",
        style: { color: "#e6007e", fontSize: "1.25rem", fontWeight: 600, textDecoration: "none" },
      },
      "123-456-7890"
      ),
    createElement(
      "h2",
      { style: { fontSize: "1.4rem", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" } },
      "אימייל"
      ),
    createElement(
      "a",
      {
        href: "mailto:hello@ezorders.com",
        style: { color: "#e6007e", fontSize: "1.15rem", fontWeight: 600, textDecoration: "none" },
      },
      "hello@ezorders.com"
      )
    );

return createElement(PageLayout, { locale: "he" }, content);
}
