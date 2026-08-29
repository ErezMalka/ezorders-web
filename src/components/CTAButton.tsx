import Link from "next/link";
import { clsx } from "clsx";

type Props = {
  href?: string;
  children?: React.ReactNode;
  variant?: "solid" | "link";
  className?: string;
};

export function CTAButton({ href = "#", children, variant = "solid", className }: Props) {
  return (
    <Link
      href={href}
      className={clsx(
        variant === "solid"
          ? "inline-block rounded-pill bg-brand-pinkStrong px-9 py-3.5 text-center font-medium text-white transition hover:bg-brand-pinkInk"
          : "inline-block font-medium text-brand-dark underline underline-offset-4 hover:text-brand-pinkInk",
        className
      )}
    >
      {children}
    </Link>
  );
}
