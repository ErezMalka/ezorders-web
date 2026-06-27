import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { Hero } from "@/components/sections/Hero";
import { TrustedUsers } from "@/components/sections/TrustedUsers";
import { Services } from "@/components/sections/Services";
import { Benefits } from "@/components/sections/Benefits";
import { AboutUs } from "@/components/sections/AboutUs";
import { FriendlyProcess } from "@/components/sections/FriendlyProcess";
import { SampleApps } from "@/components/sections/SampleApps";
import { ContactBand } from "@/components/sections/ContactBand";

export const metadata: Metadata = {
  title: "Home - ezorders",
  description:
    "EZorders turns offline to online — digital menus, online ordering, kiosk stands and apps for modern restaurants.",
};

export default function HomePage() {
  return (
    <PageLayout>
      <Hero />
      <TrustedUsers />
      <Services />
      <Benefits />
      <AboutUs />
      <FriendlyProcess />
      <SampleApps />
      <ContactBand />
    </PageLayout>
  );
}