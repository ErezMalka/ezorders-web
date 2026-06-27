import Link from "next/link";
import { clsx } from "clsx";

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: "solid" | "link";
  className?: string;
};

export function CTAButton({ href = "#", children, variant = "solid", className }: Props) {
  return (
    <Link
      href={href}
      className={clsx(
        variant === "solid"
          ? "inline-block rounded-pill bg-brand-pink px-9 py-3.5 text-center font-medium text-white transition hover:bg-brand-pinkDark"
          : "inline-block font-medium text-brand-dark underline underline-offset-4 hover:text-brand-pink",
        className
      )}
    >
      {children}
    </Link>
  );
}