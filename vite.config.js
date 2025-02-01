import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [
    react(),
    checker({
      overlay: { initialIsOpen: false },
      typescript: true,
      biome: {
        build: { command: "ci" },
      },
    }),
  ],
});
