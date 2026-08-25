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
  title: "\u05d3\u05e3 \u05d4\u05d1\u05d9\u05ea - ezorders",
  description:
    "EZOrders \u05d4\u05d5\u05e4\u05db\u05ea \u05d0\u05d5\u05e4\u05dc\u05d9\u05d9\u05df \u05dc\u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df \u2014 \u05ea\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d3\u05d9\u05d2\u05d9\u05d8\u05dc\u05d9\u05d9\u05dd, \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df, \u05e2\u05de\u05d3\u05d5\u05ea \u05e7\u05d9\u05d5\u05e1\u05e7 \u05d5\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d5\u05ea \u05dc\u05de\u05e1\u05e2\u05d3\u05d5\u05ea \u05de\u05d5\u05d3\u05e8\u05e0\u05d9\u05d5\u05ea.",
  alternates: {
    canonical: "./",
    languages: {
      en: "/en",
      he: "/he",
      "x-default": "/he",
    },
  },
};

export default function HeHomePage() {
  return (
    <PageLayout locale="he">
      <Hero locale="he" />
      <Services locale="he" />
      <Capabilities locale="he" variant="home" />
      <Benefits locale="he" />
      <AboutUs locale="he" />
      <FriendlyProcess locale="he" />
      <SampleApps locale="he" />
      <ContactBand locale="he" />
    </PageLayout>
  );
}
