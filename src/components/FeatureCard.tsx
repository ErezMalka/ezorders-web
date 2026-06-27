type Props = {
  title: string;
  body: string;
  icon?: React.ReactNode;
};

export function FeatureCard({ title, body, icon }: Props) {
  return (
    <div className="flex gap-5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-grey text-brand-indigo">
        {icon ?? "♥"}
      </div>
      <div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-brand-muted">{body}</p>
      </div>
    </div>
  );
}