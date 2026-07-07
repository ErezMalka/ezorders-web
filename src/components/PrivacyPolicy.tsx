import { createElement, Fragment } from "react";

type Locale = "en" | "he";

type Section = { heading: string; body: string };

type Content = {
    title: string;
    intro: string;
    updated: string;
    sections: Section[];
};

const CONTENT: Record<Locale, Content> = {
    en: {
          title: "Privacy Policy",
          updated: "Last updated: January 2025",
          intro:
                  "EZOrders (\u201cwe\u201d, \u201cus\u201d, \u201cour\u201d) respects your privacy. This policy explains what information we collect through this website, how we use it, and the choices you have.",
          sections: [
            {
                      heading: "Information we collect",
                      body:
                                  "When you submit our contact form, we collect the details you provide \u2014 such as your name, email address, phone number and message. We may also collect basic, non-identifying usage data to help us improve the site.",
            },
            {
                      heading: "How we use your information",
                      body:
                                  "We use the information you provide solely to respond to your enquiry, to contact you about EZOrders products and services you asked about, and to improve our offering. We do not sell your personal information.",
            },
            {
                      heading: "Sharing",
                      body:
                                  "We share information only with service providers that help us operate the website and respond to your requests, and only to the extent needed to provide those services. We may also disclose information where required by law.",
            },
            {
                      heading: "Data retention",
                      body:
                                  "We keep the information you submit for as long as needed to respond to your request and for legitimate business purposes, after which it is deleted or anonymised.",
            },
            {
                      heading: "Your rights",
                      body:
                                  "You may request access to, correction of, or deletion of the personal information you provided to us. To exercise these rights, contact us using the details below.",
            },
            {
                      heading: "Contact us",
                      body:
                                  "If you have any questions about this policy or your data, email us at hello@ezorders.com.",
            },
                ],
    },
    he: {
          title: "\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea",
          updated: "\u05e2\u05d5\u05d3\u05db\u05df \u05dc\u05d0\u05d7\u05e8\u05d5\u05e0\u05d4: \u05d9\u05e0\u05d5\u05d0\u05e8 2025",
          intro:
                  "\u05d1-EZOrders \u05d0\u05e0\u05d5 \u05de\u05db\u05d1\u05d3\u05d9\u05dd \u05d0\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea \u05e9\u05dc\u05db\u05dd. \u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d6\u05d5 \u05de\u05e1\u05d1\u05d9\u05e8\u05d4 \u05d0\u05d9\u05dc\u05d5 \u05e4\u05e8\u05d8\u05d9\u05dd \u05d0\u05e0\u05d5 \u05d0\u05d5\u05e1\u05e4\u05d9\u05dd \u05d3\u05e8\u05da \u05d4\u05d0\u05ea\u05e8, \u05db\u05d9\u05e6\u05d3 \u05d0\u05e0\u05d5 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d1\u05d4\u05dd \u05d5\u05d0\u05d9\u05dc\u05d5 \u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05e2\u05d5\u05de\u05d3\u05d5\u05ea \u05dc\u05e8\u05e9\u05d5\u05ea\u05db\u05dd.",
          sections: [
            {
                      heading: "\u05d0\u05d9\u05dc\u05d5 \u05e4\u05e8\u05d8\u05d9\u05dd \u05d0\u05e0\u05d5 \u05d0\u05d5\u05e1\u05e4\u05d9\u05dd",
                      body:
                                  "\u05db\u05d0\u05e9\u05e8 \u05d0\u05ea\u05dd \u05e9\u05d5\u05dc\u05d7\u05d9\u05dd \u05d8\u05d5\u05e4\u05e1 \u05d9\u05e6\u05d9\u05e8\u05ea \u05e7\u05e9\u05e8, \u05d0\u05e0\u05d5 \u05d0\u05d5\u05e1\u05e4\u05d9\u05dd \u05d0\u05ea \u05d4\u05e4\u05e8\u05d8\u05d9\u05dd \u05e9\u05de\u05e1\u05e8\u05ea\u05dd \u2014 \u05e9\u05dd, \u05db\u05ea\u05d5\u05d1\u05ea \u05d0\u05d9\u05de\u05d9\u05d9\u05dc, \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df \u05d5\u05d4\u05d5\u05d3\u05e2\u05d4. \u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05e0\u05d0\u05e1\u05d5\u05e3 \u05d2\u05dd \u05e0\u05ea\u05d5\u05e0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05e1\u05d9\u05e1\u05d9\u05d9\u05dd \u05e9\u05d0\u05d9\u05e0\u05dd \u05de\u05d6\u05d4\u05d9\u05dd.",
            },
            {
                      heading: "\u05db\u05d9\u05e6\u05d3 \u05d0\u05e0\u05d5 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d1\u05de\u05d9\u05d3\u05e2",
                      body:
                                  "\u05d0\u05e0\u05d5 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d1\u05de\u05d9\u05d3\u05e2 \u05db\u05d3\u05d9 \u05dc\u05d4\u05d2\u05d9\u05d1 \u05dc\u05e4\u05e0\u05d9\u05d9\u05ea\u05db\u05dd, \u05dc\u05d9\u05e6\u05d5\u05e8 \u05d0\u05d9\u05ea\u05db\u05dd \u05e7\u05e9\u05e8 \u05d1\u05e0\u05d5\u05d2\u05e2 \u05dc\u05de\u05d5\u05e6\u05e8\u05d9\u05dd \u05d5\u05dc\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd \u05e9\u05dc EZOrders, \u05d5\u05dc\u05e9\u05e4\u05e8 \u05d0\u05ea \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea. \u05d0\u05e0\u05d5 \u05dc\u05d0 \u05de\u05d5\u05db\u05e8\u05d9\u05dd \u05d0\u05ea \u05d4\u05de\u05d9\u05d3\u05e2 \u05d4\u05d0\u05d9\u05e9\u05d9 \u05e9\u05dc\u05db\u05dd.",
            },
            {
                      heading: "\u05e9\u05d9\u05ea\u05d5\u05e3 \u05de\u05d9\u05d3\u05e2",
                      body:
                                  "\u05d0\u05e0\u05d5 \u05de\u05e9\u05ea\u05e4\u05d9\u05dd \u05de\u05d9\u05d3\u05e2 \u05e8\u05e7 \u05e2\u05dd \u05e1\u05e4\u05e7\u05d9 \u05e9\u05d9\u05e8\u05d5\u05ea \u05e9\u05de\u05e1\u05d9\u05d9\u05e2\u05d9\u05dd \u05dc\u05e0\u05d5 \u05dc\u05d4\u05e4\u05e2\u05d9\u05dc \u05d0\u05ea \u05d4\u05d0\u05ea\u05e8 \u05d5\u05dc\u05d8\u05e4\u05dc \u05d1\u05e4\u05e0\u05d9\u05d5\u05ea, \u05d5\u05e8\u05e7 \u05d1\u05de\u05d9\u05d3\u05d4 \u05d4\u05e0\u05d3\u05e8\u05e9\u05ea. \u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05e0\u05d7\u05e9\u05d5\u05e3 \u05de\u05d9\u05d3\u05e2 \u05d0\u05dd \u05e0\u05d3\u05e8\u05e9 \u05dc\u05db\u05da \u05e2\u05dc \u05e4\u05d9 \u05d3\u05d9\u05df.",
            },
            {
                      heading: "\u05e9\u05de\u05d9\u05e8\u05ea \u05de\u05d9\u05d3\u05e2",
                      body:
                                  "\u05d0\u05e0\u05d5 \u05e9\u05d5\u05de\u05e8\u05d9\u05dd \u05d0\u05ea \u05d4\u05de\u05d9\u05d3\u05e2 \u05e9\u05de\u05e1\u05e8\u05ea\u05dd \u05db\u05dc \u05e2\u05d5\u05d3 \u05d4\u05d5\u05d0 \u05e0\u05d3\u05e8\u05e9 \u05db\u05d3\u05d9 \u05dc\u05d4\u05d2\u05d9\u05d1 \u05dc\u05e4\u05e0\u05d9\u05d9\u05ea\u05db\u05dd \u05d5\u05dc\u05e6\u05e8\u05db\u05d9\u05dd \u05e2\u05e1\u05e7\u05d9\u05d9\u05dd \u05dc\u05d2\u05d9\u05d8\u05d9\u05de\u05d9\u05d9\u05dd, \u05d5\u05dc\u05d0\u05d7\u05e8 \u05de\u05db\u05df \u05d4\u05d5\u05d0 \u05e0\u05de\u05d7\u05e7 \u05d0\u05d5 \u05d4\u05d5\u05e4\u05da \u05d0\u05e0\u05d5\u05e0\u05d9\u05de\u05d9.",
            },
            {
                      heading: "\u05d4\u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05e9\u05dc\u05db\u05dd",
                      body:
                                  "\u05d0\u05ea\u05dd \u05e8\u05e9\u05d0\u05d9\u05dd \u05dc\u05d1\u05e7\u05e9 \u05dc\u05e2\u05d9\u05d9\u05df \u05d1\u05de\u05d9\u05d3\u05e2 \u05e9\u05de\u05e1\u05e8\u05ea\u05dd, \u05dc\u05ea\u05e7\u05df \u05d0\u05d5\u05ea\u05d5 \u05d0\u05d5 \u05dc\u05d1\u05e7\u05e9 \u05d0\u05ea \u05de\u05d7\u05d9\u05e7\u05ea\u05d5. \u05dc\u05de\u05d9\u05de\u05d5\u05e9 \u05d4\u05d6\u05db\u05d5\u05d9\u05d5\u05ea, \u05e6\u05e8\u05d5 \u05d0\u05d9\u05ea\u05e0\u05d5 \u05e7\u05e9\u05e8 \u05d1\u05e4\u05e8\u05d8\u05d9\u05dd \u05e9\u05dc\u05de\u05d8\u05d4.",
            },
            {
                      heading: "\u05e6\u05d5\u05e8 \u05e7\u05e9\u05e8",
                      body:
                                  "\u05dc\u05e9\u05d0\u05dc\u05d5\u05ea \u05d1\u05e0\u05d5\u05d2\u05e2 \u05dc\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d6\u05d5 \u05d0\u05d5 \u05dc\u05de\u05d9\u05d3\u05e2 \u05e9\u05dc\u05db\u05dd, \u05e9\u05dc\u05d7\u05d5 \u05dc\u05e0\u05d5 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05dc-hello@ezorders.com.",
            },
                ],
    },
};

export function PrivacyPolicy({ locale = "en" }: { locale?: Locale }) {
    const c = CONTENT[locale];

  const sectionNodes = c.sections.map((s) =>
        createElement(
                "div",
          { key: s.heading, style: { marginBottom: "2rem" } },
                createElement(
                          "h2",
                  { style: { fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" } },
                          s.heading
                        ),
                createElement("p", { style: { color: "#555", lineHeight: 1.8 } }, s.body)
              )
                                        );

  return createElement(
        "section",
    { style: { padding: "8rem 1.5rem 4rem", maxWidth: "48rem", margin: "0 auto" } },
        createElement(
                "h1",
          { style: { fontSize: "2.5rem", fontWeight: 700, marginBottom: "0.5rem" } },
                c.title
              ),
        createElement(
                "p",
          { style: { color: "#999", fontSize: "0.9rem", marginBottom: "1.5rem" } },
                c.updated
              ),
        createElement(
                "p",
          { style: { color: "#555", lineHeight: 1.8, marginBottom: "2.5rem" } },
                c.intro
              ),
        createElement(Fragment, null, sectionNodes)
      );
}
