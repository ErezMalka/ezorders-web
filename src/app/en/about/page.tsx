import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";
import { SIGNUP_URL } from "@/data/content";

export const metadata: Metadata = {
  title: "About - ezorders",
  description:
    "Get to know EZOrders — we build mobile-first digital menus for restaurants that update in seconds and guide guests smoothly from browsing to ordering.",
};

export default function AboutPage() {
  return (
    <PageLayout>
      {/* HERO */}
      <section className="bg-brand-grey pb-20 pt-36 text-center">
        <div className="mx-auto max-w-3xl px-6">
          <span className="mb-6 inline-block rounded-pill bg-brand-tint px-6 py-2 text-sm font-medium text-brand-pink">
            About
          </span>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Get to know <span className="text-brand-pink">EZ</span>
            <span className="text-brand-indigo">Orders.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-muted">
            EZorders helps restaurants turn every menu view into a moment of
            decision. We build mobile-first digital menus for restaurants that
            update in seconds, look great on any phone, and guide people smoothly
            from browsing to ordering-raising average check and reducing
            front-of-house friction.
          </p>
        </div>
      </section>

      {/* MISSION + VISION */}
      <section className="mx-auto max-w-container px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold">Our Mission</h2>
            <p className="text-brand-muted">
              Empowering restaurant owners to stay in control-even mid-rush.
              Ezorders puts pricing, availability, and specials a tap away on
              phone, tablet, or kiosk, so you can react to demand without
              reprints or design tickets. Clear item cards with photos and
              transparent info (allergens, tags, languages) cut back-and-forth at
              the table, while one-tap actions lift add-ons and speed turns. Our
              mission is practical: a mobile-first digital restaurant menu that
              reduces labor drag, keeps the floor calm, and grows revenue shift
              after shift.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-3xl font-bold">Our Vision</h2>
            <p className="text-brand-muted">
              Menus are becoming dynamic, data-informed experiences that adapt to
              the moment-time of day, inventory, and demand. We’re building
              towards smarter recommendations, richer item cards, and analytics
              that highlight what matters without complexity. The vision: a menu
              that feels alive, supports better decisions in the kitchen and at
              the table, and keeps your brand consistent across locations.
            </p>
          </div>
        </div>
        <div className="mt-12 text-center">
          <CTAButton href={SIGNUP_URL}>Already use EZOrders</CTAButton>
        </div>
      </section>

      <StatsStrip />
      <Testimonials />
      <ContactBand />
    </PageLayout>
  );
}