import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: "media",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { bg: "var(--bg)", card: "var(--card)", text: "var(--text)", muted: "var(--muted)", brand: { pink:"var(--brand-pink)", magenta:"var(--brand-magenta)", blue:"var(--brand-blue)" } },
    borderRadius: { xl: "var(--radius)", "2xl": "calc(var(--radius) + 6px)" },
    boxShadow: { soft: "var(--shadow)" },
    keyframes: { pingSlow: { "0%":{ transform:"scale(1)", opacity:"0.8" }, "50%":{ transform:"scale(1.8)", opacity:"0.2" }, "100%":{ transform:"scale(1)", opacity:"0.8" } } },
    animation: { "ping-slow":"pingSlow 1.6s infinite" }
  } },
  plugins: [],
};
export default config;
