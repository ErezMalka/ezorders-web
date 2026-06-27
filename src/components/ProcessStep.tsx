type Props = {
  number: number;
  title: string;
  body: string;
  icon?: React.ReactNode;
};

export function ProcessStep({ number, title, body, icon }: Props) {
  return (
    <div className="relative rounded-card bg-white p-8 shadow-sm">
      <span className="absolute -top-4 left-6 text-2xl font-bold text-brand-dark">
        {number}
      </span>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brand-indigo text-brand-indigo">
        {icon ?? "●"}
      </div>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="text-brand-muted">{body}</p>
    </div>
  );
}