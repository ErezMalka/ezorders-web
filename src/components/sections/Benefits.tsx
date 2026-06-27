import { FeatureCard } from "@/components/FeatureCard";
import { homeBenefits } from "@/data/content";

export function Benefits() {
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="flex justify-center">
          <div className="flex h-[420px] w-full max-w-md items-center justify-center rounded-full bg-brand-grey">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/benefits-app.png"
              alt="App preview"
              className="max-h-[400px] w-auto"
            />
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            How it’s <span className="text-brand-indigo">benefits</span> your
            business?
          </h2>
          <p className="mt-4 text-brand-muted">
            Discover why restaurants worldwide trust EzOrders to power their
            restaurant ordering system.
          </p>
          <div className="mt-10 space-y-8">
            {homeBenefits.map((b) => (
              <FeatureCard key={b.title} title={b.title} body={b.body} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}