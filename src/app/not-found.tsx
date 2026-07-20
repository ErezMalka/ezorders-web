import Link from "next/link";
import type { Metadata } from "next";
import { PageLayout } from "@/components/PageLayout";
import { CTAButton } from "@/components/CTAButton";

export const metadata: Metadata = {
  title: "404 - ezorders",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PageLayout>
      <section className="mx-auto flex min-h-[70vh] max-w-container flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-7xl font-extrabold text-brand-indigo md:text-8xl">
          4<span className="text-brand-pink">0</span>4
        </p>
        <h1 className="mt-6 text-3xl font-bold md:text-4xl">
          Page not found · העמוד לא נמצא
        </h1>
        <p className="mt-4 max-w-md text-brand-muted">
          The page you’re looking for doesn’t exist or has moved.
          <br />
          העמוד שחיפשתם לא קיים או הועבר.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <CTAButton href="/">Back home</CTAButton>
          <CTAButton href="/he" variant="link">
            לעמוד הבית
          </CTAButton>
        </div>
      </section>
    </PageLayout>
  );
}
