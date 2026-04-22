import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101113",
        paper: "#f7f7f4",
        violet: {
          coach: "#7467f0"
        },
        teal: {
          ready: "#19b99a"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgb(16 17 19 / 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
