import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#121212",
        "surface-2": "#181818",
        border: "#222222",
        "border-strong": "#3a3a3a",
        fg: "#f5f5f5",
        muted: "#8a8a8a",
        accent: "#7cff7c",
        "accent-warm": "#ffb066",
        "accent-pink": "#ff7eb6",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(60% 80% at 50% 0%, rgba(124,255,124,0.10), transparent 70%)",
        "creator-card": "linear-gradient(135deg, rgba(124,255,124,0.06), rgba(255,176,102,0.04) 100%)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
