import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "scale-in": {
          "0%": {
            transform: "scale(0)",
            transformOrigin: "var(--radix-popover-content-transform-origin)",
          },
          "100%": {
            transform: "scale(1)",
            transformOrigin: "var(--radix-popover-content-transform-origin)",
          },
        },
        "scale-out": {
          "0%": {
            transform: "scale(1)",
            transformOrigin: "var(--radix-popover-content-transform-origin)",
          },
          "100%": {
            transform: "scale(0)",
            transformOrigin: "var(--radix-popover-content-transform-origin)",
          },
        },
      },
      animation: {
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-out": "scale-out 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        rgray: {
          1: "var(--gray-1)",
          2: "var(--gray-2)",
          3: "var(--gray-3)",
          4: "var(--gray-4)",
          5: "var(--gray-5)",
          6: "var(--gray-6)",
          7: "var(--gray-7)",
          8: "var(--gray-8)",
          9: "var(--gray-9)",
          10: "var(--gray-10)",
          11: "var(--gray-11)",
          12: "var(--gray-12)",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [require("tailwindcss-animate")],
};
export default config;
