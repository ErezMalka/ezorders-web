import Image from "next/image";
import Link from "next/link";

import logoSrc from "../../public/images/logo.webp";

/**
 * The wordmark.
 *
 * This used to draw the brand as styled text — "EZ" in pink, "Orders." in
 * indigo, the tagline underneath in grey. It was close, which is the problem:
 * close means the header, the quote and the business card are three slightly
 * different marks, and the one a customer sees on a document they are about to
 * sign should be the same one that is on the website.
 *
 * Static import rather than a string path, so Next knows the intrinsic size and
 * reserves the space before the file arrives. The image is 420px wide and drawn
 * at 132, which is what keeps it sharp on a phone.
 */
export function Logo({
  href = "/",
  width = 132,
  /** Preload it. True in the site header, where it is the first thing painted;
   *  false in the footer, where preloading a below-the-fold image is waste. */
  priority = false,
}: {
  href?: string;
  width?: number;
  priority?: boolean;
}) {
  return (
    <Link href={href} className="inline-block leading-none" aria-label="EZOrders">
      <Image
        src={logoSrc}
        alt="EZOrders"
        width={width}
        height={Math.round((width * 135) / 420)}
        priority={priority}
        className="h-auto w-auto"
        style={{ width, height: "auto" }}
      />
    </Link>
  );
}
