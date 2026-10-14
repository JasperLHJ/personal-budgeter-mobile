import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"] },
      manifest: {
        name: "Budgeter",
        short_name: "Budgeter",
        start_url: "./",
        scope: "./",
        display: "standalone",
        theme_color: "#0f6b5c",
        background_color: "#f5f3ee",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
