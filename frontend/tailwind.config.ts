import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#060b12",
        surface: "#0d1522",
        panel: "#121d30",
        line: "#22324b",
        glow: "#ff6a3d",
        mint: "#57f2c3",
        blue: "#67b2ff",
        gold: "#ffd26f"
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.35)",
        glow: "0 0 60px rgba(255, 106, 61, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
