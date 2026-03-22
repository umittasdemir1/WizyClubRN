import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
        display: ["Poppins", "system-ui", "sans-serif"],
        body: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
