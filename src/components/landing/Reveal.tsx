"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades a block up as it scrolls into view.
 *
 * Restrained on purpose. Motion on a landing page is there to give the eye an
 * order to read in, not to perform — a page that animates every element draws
 * attention to the animation instead of the offer, and on paid traffic that
 * costs money.
 *
 * Three rules it follows, each of which is a way this pattern usually goes
 * wrong:
 *
 *   1. If the visitor asks for reduced motion, nothing moves at all. Not a
 *      shorter animation — none.
 *   2. The content is visible from the first paint and the transition only
 *      takes effect once JavaScript has mounted. A reveal that starts at
 *      opacity 0 in the markup hides the page from anyone whose JS fails, and
 *      from a crawler that does not run it.
 *   3. It disconnects after firing. An observer left watching every card on a
 *      long page is work done for nothing.
 */
export function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Starts "shown". Only a mounted, motion-tolerant client ever hides it.
  const [shown, setShown] = useState(true);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const el = ref.current;
    if (!el) return;

    setArmed(true);
    setShown(false);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          io.disconnect();
        }
      },
      // Fires a little before the block reaches the viewport, so the movement
      // has finished by the time it is properly in view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transition: armed ? "opacity .55s ease-out, transform .55s ease-out" : undefined,
        transitionDelay: armed ? `${delay}ms` : undefined,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
      }}
    >
      {children}
    </div>
  );
}
