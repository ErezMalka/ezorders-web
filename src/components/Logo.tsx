import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold leading-none">
      <span className="text-brand-pink">EZ</span>
      <span className="text-brand-indigo">Orders.</span>
      <span className="mt-0.5 block text-xs font-normal text-brand-muted">
        Digital in one click
      </span>
    </Link>
  );
}