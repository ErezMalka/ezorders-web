import { testimonials } from "@/data/content";

export function Testimonials() {
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <h2 className="mb-3 text-center text-3xl font-bold md:text-4xl">
        Hear what our clients say
      </h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-brand-muted">
        Don’t just take our word for it—hear from restaurant owners who have
        transformed their business with EZorders!
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-card bg-brand-grey p-8">
            <p className="mb-6 text-brand-muted">“{t.quote}”</p>
            <p className="font-semibold">{t.name}</p>
            <p className="text-sm text-brand-muted">{t.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}