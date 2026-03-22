import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        teak: {
          gold: "#A88554",
          "gold-light": "#C4A474",
          "gold-dark": "#8A6B3E",
        },
        marine: {
          navy: "#001529",
          "navy-light": "#002244",
          "navy-dark": "#000D1A",
        },
        pearl: {
          white: "#FDFCFB",
          warm: "#F7F4F0",
          muted: "#EDE8E1",
        },
        charcoal: {
          DEFAULT: "#1A1A1A",
          light: "#333333",
          muted: "#666666",
        },
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.8s ease-out forwards",
        "fade-in": "fadeIn 1s ease-out forwards",
        "slide-in": "slideIn 0.6s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
