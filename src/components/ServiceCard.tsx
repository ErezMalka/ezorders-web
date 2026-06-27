import { CTAButton } from "./CTAButton";

type Props = {
  title: string;
  body: string;
  href: string;
  icon?: React.ReactNode;
};

export function ServiceCard({ title, body, href, icon }: Props) {
  return (
    <div className="rounded-card bg-brand-grey p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-indigo">
        {icon ?? "■"}
      </div>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="mb-5 text-brand-muted">{body}</p>
      <CTAButton href={href} variant="link">
        Learn More
      </CTAButton>
    </div>
  );
}