import { Poppins, Rubik } from "next/font/google";

// Shared font instances for every root layout (route groups (en)/(he)/(site)).
// Defined once so all documents expose the same CSS variables.

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

/**
 * The Hebrew face.
 *
 * Poppins carries no Hebrew glyphs, so every Hebrew word on this site was being
 * drawn by whatever the operating system chose — metric-adjusted to Poppins by
 * next/font, which kept the layout stable and left the letterforms generic.
 * Measured before adding this: the Hebrew rendered at a different width from
 * the named stack, which is what a silent fallback looks like.
 *
 * Rubik because it is geometric and slightly rounded, which is the same
 * temperament as Poppins — so "EZOrders" set in Latin sits beside a Hebrew
 * headline without the two looking borrowed from different projects. Latin is
 * included in the subset so mixed strings like "קופה (POS)" do not switch face
 * mid-word.
 */
export const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});
