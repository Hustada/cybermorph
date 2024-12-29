import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "cyber-black": "#0a0a0a",
        "cyber-charcoal": "#1a1a1a",
        "cyber-cyan": "#00fff9",
        "cyber-magenta": "#ff00ff",
        "cyber-white": "#ffffff",
      },
      boxShadow: {
        "neon-cyan": "0 0 5px #00fff9, 0 0 20px rgba(0, 255, 249, 0.3)",
        "neon-magenta": "0 0 5px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)",
      },
      animation: {
        "pulse-cyan": "pulse-cyan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-magenta": "pulse-magenta 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "pulse-cyan": {
          "0%, 100%": { boxShadow: "0 0 5px #00fff9, 0 0 20px rgba(0, 255, 249, 0.3)" },
          "50%": { boxShadow: "0 0 10px #00fff9, 0 0 30px rgba(0, 255, 249, 0.5)" },
        },
        "pulse-magenta": {
          "0%, 100%": { boxShadow: "0 0 5px #ff00ff, 0 0 20px rgba(255, 0, 255, 0.3)" },
          "50%": { boxShadow: "0 0 10px #ff00ff, 0 0 30px rgba(255, 0, 255, 0.5)" },
        },
      },
      fontFamily: {
        exo: ["Exo 2", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
