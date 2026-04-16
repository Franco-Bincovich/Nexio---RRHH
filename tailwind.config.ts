import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        // accent stays hardcoded — same in dark and light themes
        accent: "#3ECFB2",
        // Dynamic colors via CSS variables (channel format for opacity support)
        surface:    "rgb(var(--color-surface)    / <alpha-value>)",
        base:       "rgb(var(--color-base)       / <alpha-value>)",
        sidebar:    "rgb(var(--color-sidebar)    / <alpha-value>)",
        secondary:  "rgb(var(--color-secondary)  / <alpha-value>)",
        border:     "rgb(var(--color-border)     / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
