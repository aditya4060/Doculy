import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#18212f",
        line: "#dce2ea",
        paper: "#f7f8fb",
        accent: "#0f766e",
        coral: "#c2410c"
      }
    }
  },
  plugins: []
};

export default config;
