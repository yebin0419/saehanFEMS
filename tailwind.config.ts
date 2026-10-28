import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f5f7fb",
        surface: "#ffffff",
        border: "#e3e7ef",
        text: "#1f2937",
        muted: "#6b7280",
        primary: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
        },
        run: "#22c55e",
        down: "#f59e0b",
        stop: "#ef4444",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        card: "10px",
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "Malgun Gothic",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
