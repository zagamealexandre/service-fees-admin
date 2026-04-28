import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        subtle: "#64748b",
        line: "#e2e8f0",
      },
    },
  },
  plugins: [],
};

export default config;
