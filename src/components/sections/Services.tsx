import { ServiceCard } from "@/components/ServiceCard";
import { homeServices } from "@/data/content";

export function Services() {
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <h2 className="text-4xl font-bold md:text-5xl">
        Our <span className="text-brand-indigo">Services</span>
      </h2>
      <p className="mt-4 max-w-2xl text-brand-muted">
        Here at EZorders we turn Offline to Online. Unlock the future of
        restaurant operations with our advanced ordering system. intuitive
        digital menus, user-friendly online platforms, and cutting-edge kiosk
        stands..
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {homeServices.map((s) => (
          <ServiceCard
          key={s.title}
          title={s.title}
          body={s.body}
          href={s.href}
          icon={
            (s as { icon?: string }).icon ? (
              <img
                src={(s as { icon?: string }).icon}
                alt=""
                width={60}
                height={60}
                aria-hidden="true"
              />
            ) : undefined
          }
        />
        ))}
      </div>
    </section>
  );
}
