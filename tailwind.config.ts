import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        // Paleta extraída da logo da Rede Única de Baterias
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#a9c3ff",
          300: "#6f97f5",
          400: "#3d68d6",
          500: "#1f45ad",
          600: "#122d76", // azul primário da marca
          700: "#0c1f5c",
          800: "#081547",
          900: "#050d33", // azul-marinho profundo (fundo da logo)
        },
        gold: {
          50: "#fffdf0",
          100: "#fffac2",
          200: "#fff585",
          300: "#ffec3d",
          400: "#ffe600", // dourado vibrante da marca
          500: "#f2ce00",
          600: "#c9a800",
          700: "#997e00",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #050d33 0%, #0c1f5c 45%, #122d76 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
