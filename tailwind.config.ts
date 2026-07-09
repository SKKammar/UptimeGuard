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
        background: "var(--background)",
        foreground: "var(--foreground)",
        white: "var(--color-white, #ffffff)",
        gray: {
          50: "var(--color-gray-50, #f9fafb)",
          100: "var(--color-gray-100, #f3f4f6)",
          200: "var(--color-gray-200, #e5e7eb)",
          300: "var(--color-gray-300, #d1d5db)",
          400: "var(--color-gray-400, #9ca3af)",
          500: "var(--color-gray-500, #6b7280)",
          600: "var(--color-gray-600, #4b5563)",
          700: "var(--color-gray-700, #374151)",
          800: "var(--color-gray-800, #1f2937)",
          900: "var(--color-gray-900, #111827)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
