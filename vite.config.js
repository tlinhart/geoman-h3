import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";

export default defineConfig({
  define: {
    __APP_NAME__: JSON.stringify(process.env.npm_package_name),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
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
