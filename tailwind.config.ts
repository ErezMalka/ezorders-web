import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#F05D86",
          pinkDark: "#E14C77",
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