import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Capabilities } from "@/components/sections/Capabilities";
import { Benefits } from "@/components/sections/Benefits";
import { AboutUs } from "@/components/sections/AboutUs";
import { FriendlyProcess } from "@/components/sections/FriendlyProcess";
import { SampleApps } from "@/components/sections/SampleApps";
import { ContactBand } from "@/components/sections/ContactBand";

export const metadata: Metadata = {
  alternates: {
    canonical: "./",
    languages: {
      en: "/en",
      he: "/he",
      // "/" serves Hebrew (middleware.ts), so that is the fallback.
      "x-default": "/he",
    },
  },
  title: "Restaurant Management System — POS, Kiosk, Menu | EZOrders",
  description:
    "EZorders turns offline to online — digital menus, online ordering, kiosk stands and apps for modern restaurants.",
};

export default function HomePage() {
  return (
    <PageLayout>
      <Hero />
      <Services />
      <Capabilities variant="home" />
      <Benefits />
      <AboutUs />
      <FriendlyProcess />
      <SampleApps />
      <ContactBand />
    </PageLayout>
  );
}