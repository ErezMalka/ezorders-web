import { ContactForm } from "@/components/ContactForm";
import { getHomeContent, type Locale } from "@/data/homeContent";

export function ContactBand({ locale = "en" }: { locale?: Locale }) {
  const t = getHomeContent(locale);
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="grid items-center gap-10 rounded-card bg-brand-indigo p-10 md:grid-cols-2 md:p-16">
        <div className="text-white">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">{t.contactTitle}</h2>
          <p className="text-lg text-white/90">{t.contactLead}</p>
        </div>
        {/* The h2 above already says this, word for word. */}
        <ContactForm locale={locale} showHeading={false} />
      </div>
    </section>
  );
}
