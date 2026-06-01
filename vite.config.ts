import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Icons generated from public/logo.svg via pwa-assets.config.ts; injected
      // into the manifest and <head> automatically.
      pwaAssets: { config: true },
      manifest: {
        name: "StreakPact · 两人打卡契约",
        short_name: "StreakPact",
        description: "两人月度打卡契约：设定任务、每日打卡、奖惩兑现。",
        lang: "zh-CN",
        theme_color: "#0D9488",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
      },
      workbox: {
        // Precache the built app shell. Supabase calls are cross-origin and are never
        // cached — data is always fetched fresh from the network.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
