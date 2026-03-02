/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary accent — orange
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          900: "#7c2d12",
        },
        // Page & card surfaces
        surface: {
          50:  "#F9F9F7",
          100: "#F2F2F0",
          200: "#E5E5E3",
          300: "#D1D1CF",
          400: "#A8A8A6",
        },
        // Text
        ink: {
          DEFAULT:   "#111111",
          secondary: "#6B6B6B",
          tertiary:  "#9B9B9B",
          inverse:   "#FFFFFF",
        },
        // Dark card backgrounds
        canvas: {
          DEFAULT:  "#111111",
          elevated: "#1A1A1A",
          subtle:   "#222222",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      boxShadow: {
        card:      "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-md": "0 4px 12px 0 rgba(0,0,0,0.07)",
        "card-lg": "0 8px 24px 0 rgba(0,0,0,0.10)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
