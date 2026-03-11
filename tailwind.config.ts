import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F5F2EC",
        surface: "#EDE9E0",
        "text-primary": "#1A1915",
        "text-secondary": "#5C5850",
        "text-muted": "#9C988E",
        accent: "#2D2B26",
        border: "#D8D3C8",
        success: "#3A6B4A",
        warning: "#C26B3A",
        gold: "#C8A84B",
        info: "#3A4F6B",
        danger: "#8B3A3A",
        "success-light": "#EBF3EE",
        "warning-light": "#F9EDE5",
        "gold-light": "#FAF4E5",
        "info-light": "#E8EDF3",
        "danger-light": "#F3E8E8",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        pill: "100px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(26,25,21,0.08), 0 1px 2px rgba(26,25,21,0.04)",
        "card-hover": "0 4px 12px rgba(26,25,21,0.12), 0 2px 4px rgba(26,25,21,0.06)",
        modal: "0 20px 60px rgba(26,25,21,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
