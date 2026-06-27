import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";
import { Testimonials } from "@/components/sections/Testimonials";
import { ContactBand } from "@/components/sections/ContactBand";
import { SIGNUP_URL } from "@/data/content";

export const metadata: Metadata = {
  title: "Solutions - ezorders",
  description:
    "Digitize your restaurant menu with endless options — digital menus, websites, membership clubs, kiosk stands, applications and an order management system.",
};

const technologies = [
  { label: "Digital Menus", href: "/digital-menus" },
  { label: "Websites", href: "/restaurant-ordering-website" },
  { label: "Memberships Clubs", href: "/solutions" },
  { label: "Kiosk Stands", href: "/kiosk-stands" },
  { label: "Applications", href: "/restaurant-ordering-app" },
  { label: "Order Management System", href: "/solutions" },
];

export default function SolutionsPage() {
  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="mx-auto grid max-w-container items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <span className="mb-6 inline-block rounded-pill bg-brand-tint px-5 py-2 text-sm font-medium text-brand-pink">
              Solutions
            </span>
            <h1 className="text-5xl font-bold leading-tight md:text-6xl">
              <span className="text-brand-indigo">Digitize</span> your restaurant
              menu with endless options
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-muted">
              It’s the time to dive in the newest technology that will let you
              enjoy the digital world and it’s benefits.
            </p>
            <div className="mt-8 flex items-center gap-8">
              <CTAButton href={SIGNUP_URL}>Try Free for 14 Days</CTAButton>
              <CTAButton href="#technologies" variant="link">
                Our Technologies
              </CTAButton>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-[420px] w-[420px] items-center justify-center rounded-full bg-brand-indigo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/solutions-chef.png"
                alt="Chef holding phone"
                className="max-h-[400px] w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* OUR SERVICES / TECHNOLOGIES */}
      <section id="technologies" className="mx-auto max-w-container px-6 py-20">
        <p className="mb-2 text-sm font-medium text-brand-pink">
          Our Technologies
        </p>
        <h2 className="text-4xl font-bold md:text-5xl">Our Services</h2>
        <p className="mt-4 max-w-2xl text-brand-muted">
          Here at EZorders we turn Offline to Online. Unlock the future of
          restaurant operations with our advanced ordering system. intuitive
          digital menus, user-friendly online platforms, and cutting-edge kiosk
          stands.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div className="rounded-card bg-brand-grey p-8">
            <h3 className="mb-3 text-2xl font-semibold text-brand-indigo">
              Digital Menus
            </h3>
            <p className="text-brand-muted">
              Our digital menu boards provide a modern and eye-catching platform
              for showcasing your menu items, promotions, and special offers.
              With easy-to-use content management systems, you can effortlessly
              customize and schedule your menu. Enhance your restaurant&apos;s
              atmosphere, engage customers, and drive sales with our cutting-edge
              digital menu board solutions.
            </p>
          </div>
          <div className="grid content-start gap-3">
            {technologies.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="rounded-card border border-gray-200 px-6 py-4 font-medium transition hover:border-brand-indigo hover:text-brand-indigo"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />
      <ContactBand />
    </PageLayout>
  );
}