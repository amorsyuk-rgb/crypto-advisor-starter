import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  root: ".",                          // Root is client/
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"), // entry point
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"), // optional cleaner imports
    },
  },
});
