import { ProcessStep } from "@/components/ProcessStep";
import { CTAButton } from "@/components/CTAButton";
import { homeProcess, SIGNUP_URL } from "@/data/content";

export function FriendlyProcess() {
  return (
    <section className="bg-brand-tint py-20">
      <div className="mx-auto max-w-container px-6 text-center">
        <h2 className="text-4xl font-bold md:text-5xl">
          <span className="text-brand-indigo">Friendly</span> Process
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-brand-muted">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit
          tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.llus, luctu
        </p>

        <div className="mt-16 grid gap-12 text-left md:grid-cols-3">
          {homeProcess.map((step) => (
            <ProcessStep
              key={step.number}
              number={step.number}
              title={step.title}
              body={step.body}
            />
          ))}
        </div>

        <div className="mt-14">
          <CTAButton href={SIGNUP_URL}>Try Free for 14 Days</CTAButton>
        </div>
      </div>
    </section>
  );
}