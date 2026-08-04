import { Poppins } from "next/font/google";

// Shared font instance for every root layout (route groups (en)/(he)/(site)).
// Defined once so all documents expose the same --font-poppins variable.
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
