import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
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
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        "from-top": {
          "0%": {
            transform: "translateY(-50px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        "input-error": {
          "0%": {
            color: "var(--gray-11)",
          },
          "50%": {
            color: "red",
          },
          "100%": {
            color: "var(--gray-11)",
          },
        },
      },
      animation: {
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-out": "scale-out 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s 0.5s forwards cubic-bezier(0.16, 1, 0.3, 1)",
        "from-top": "from-top 0.2s ease-in-out",
        "input-error": "input-error 5s",
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
  safelist: ["pb-[20vh]", "pb-5", "h-[2em]", "max-h-[2em]", "p-0"],
  darkMode: "class",
  plugins: [
    require("tailwindcss-animate"),
    plugin(function ({ addVariant }) {
      addVariant("on", "&[data-state-on='true']");
    }),
    require("tailwind-scrollbar"),
  ],
};
export default config;
