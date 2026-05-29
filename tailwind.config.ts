import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flipz: {
          pink: "#ff2d95",
          cyan: "#00f5ff",
          dark: "#0a0a12",
          panel: "#12121c",
        },
        gold: "#d4af37",
        "neon-cyan": "#00f5ff",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 20px rgba(255, 45, 149, 0.35), 0 0 40px rgba(0, 245, 255, 0.15)",
        "neon-sm": "0 0 12px rgba(255, 45, 149, 0.25)",
      },
      backgroundImage: {
        "flipz-radial":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 45, 149, 0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(0, 245, 255, 0.1), transparent), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(255, 45, 149, 0.08), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
