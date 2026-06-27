import Link from "next/link";
import { Logo } from "./Logo";
import { footerLearnMore, footerSolutions } from "@/data/content";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto grid max-w-container gap-10 px-6 py-14 md:grid-cols-4">
        <Logo />
        <FooterCol title="Learn More" links={footerLearnMore} />
        <FooterCol title="Solutions" links={footerSolutions} />
        <div>
          <h4 className="mb-4 font-semibold">Contact Us</h4>
          <p className="text-brand-muted">Tel: 123-456-7890</p>
        </div>
      </div>
      <div className="border-t border-gray-100 py-6 text-center text-sm text-brand-muted">
        © 2025 EZOrders | All Rights Reserved
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="mb-4 font-semibold">{title}</h4>
      <ul className="space-y-2 text-brand-muted">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-brand-dark">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}