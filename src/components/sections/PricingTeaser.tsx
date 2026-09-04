import { CTAButton } from "@/components/CTAButton";
import { PRICING_CONFIG, fmt } from "@/lib/pricing";

/**
 * The product pages used to carry a four-column "plans" table in US dollars
 * with a monthly/yearly toggle that changed nothing. None of those figures was
 * a price anyone was charged; the real price list is the calculator on
 * /price, in shekels, computed by the same engine the agent portal quotes
 * from. So a product page now states the one figure that is true for every
 * package — the entry price of its cheapest core product — and sends the
 * reader to build their own.
 */
export function PricingTeaser({ locale = "en" }: { locale?: "en" | "he" }) {
  const he = locale === "he";
  const floor = Math.min(...PRICING_CONFIG.coreProducts.map((p) => p.monthly));
  const maxDiscount = Math.max(...PRICING_CONFIG.discountTiers.map((t) => t.pct));
  const priceHref = he ? "/he/price" : "/en/price";

  return (
    <section className="mx-auto max-w-container px-6 py-20" dir={he ? "rtl" : "ltr"}>
      <div className="rounded-card bg-brand-indigo px-8 py-12 text-center text-white md:px-16">
        <span className="mb-4 inline-block rounded-pill bg-white/15 px-5 py-1.5 text-sm font-medium">
          {he ? "תמחור" : "Pricing"}
        </span>
        <h2 className="text-3xl font-bold md:text-4xl">
          {he ? (
            <>
              החל מ-{fmt(floor)} לחודש
            </>
          ) : (
            <>From {fmt(floor)} a month</>
          )}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/85">
          {he
            ? `בחרו קופה, אתר, קיוסק ותוספות — והמחיר מתעדכן בזמן אמת. ככל שמוסיפים יותר, ההנחה החודשית גדלה, עד ${maxDiscount}%. כל המחירים בשקלים, לפני מע"מ.`
            : `Pick a POS, website, kiosk and add-ons and watch the price update live. The more you add, the bigger the monthly discount — up to ${maxDiscount}%. All prices in ILS, before VAT.`}
        </p>
        <CTAButton href={priceHref} className="mt-8 bg-white !text-brand-indigo hover:bg-brand-tint">
          {he ? "בנו את החבילה שלכם" : "Build your package"}
        </CTAButton>
      </div>
    </section>
  );
}
