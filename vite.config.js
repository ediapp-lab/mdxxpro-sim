import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      include: ["**/*.jsx", "**/*.js"]
    })
  ],
  build: { outDir: "dist" },
  server: { port: 3000 }
});


