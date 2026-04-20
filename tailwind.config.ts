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
        // Paleta do espacowendler
        forest: {
          DEFAULT: "#2f5d50",
          50: "#f0f5f3",
          100: "#d9e6e1",
          200: "#b3ccc3",
          300: "#8db3a5",
          400: "#679987",
          500: "#2f5d50",
          600: "#264b40",
          700: "#1c3830",
          800: "#132620",
          900: "#091310",
        },
        cream: {
          DEFAULT: "#faf0e8",
          50: "#fdfaf7",
          100: "#faf0e8",
          200: "#f4e1d1",
          300: "#edd1ba",
        },
        olive: {
          DEFAULT: "#51552e",
          50: "#f2f2ec",
          500: "#51552e",
          700: "#363920",
        },
        peach: {
          DEFAULT: "#f0b987",
          50: "#fdf5ec",
          500: "#f0b987",
          600: "#d99d63",
        },
        rust: {
          DEFAULT: "#612300",
          500: "#612300",
          700: "#401700",
        },
        sand: {
          DEFAULT: "#cdac79",
          50: "#f9f3e8",
          500: "#cdac79",
          600: "#b3935e",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter-tight)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(47, 93, 80, 0.08), 0 4px 16px -4px rgba(47, 93, 80, 0.06)",
        warm: "0 4px 20px -2px rgba(97, 35, 0, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
