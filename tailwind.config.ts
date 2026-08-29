import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // The identity pink. Correct for logo marks, icons, borders, fills and
          // any decorative use — contrast rules do not apply to those.
          //
          // It must NOT carry text. White on #F05D86 is 3.17:1 against the 4.5:1
          // WCAG AA needs, and that combination was the primary CTA on every
          // page. The two variants below exist for the cases that do carry text,
          // so the brand colour stays exactly what it was everywhere else.
          pink: "#F05D86",
          pinkDark: "#E14C77",
          /** Button and badge fills that hold white text. 4.85:1 on white. */
          pinkStrong: "#D22F63",
          /** Pink used AS text on a light background. 5.29:1 on white. */
          pinkInk: "#C92A5C",
          indigo: "#3B33C8",
          dark: "#191D2A",
          tint: "#FEEFF3",
          grey: "#F8FAFC",
          muted: "#5F6575",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
      },
      borderRadius: {
        pill: "50px",
        card: "24px",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;