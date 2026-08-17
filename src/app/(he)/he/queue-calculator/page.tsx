import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { QueueCalculator } from "@/components/funnels/QueueCalculator";

export const metadata: Metadata = {
  title: "מחשבון: כמה עולה לך התור? | EZOrders",
  description:
    "בדקו תוך 30 שניות כמה כסף התור בקופה מבריח לכם בכל חודש — ומה עמדת קיוסק יכולה להחזיר. מחשבון חינם למסעדות מזון מהיר.",
  alternates: { languages: { he: "/he/queue-calculator", "x-default": "/he/queue-calculator" } },
};

export default function QueueCalculatorPage() {
  return (
    <PageLayout locale="he">
      <section className="pb-20 pt-28">
        <div className="mx-auto max-w-container px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-brand-pink">
              מחשבון חינם למסעדות
            </span>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-brand-dark md:text-4xl">
              כמה כסף התור בקופה עולה לך בכל חודש?
            </h1>
            <p className="mt-4 text-lg text-brand-muted">
              כל דקת המתנה בתור = לקוח שמתחרט. הזיזו 3 סליידרים וגלו את המספר —
              ואז נראה לכם כמה עמדת קיוסק להזמנה עצמית יכולה להחזיר.
            </p>
          </div>
          <QueueCalculator />
        </div>
      </section>
    </PageLayout>
  );
}
