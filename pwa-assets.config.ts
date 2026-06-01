import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates pwa-64/192/512, maskable, apple-touch-icon, and favicon from logo.svg.
// Placeholder art (teal + white check); swap public/logo.svg for real branding later.
export default defineConfig({
  preset: minimal2023Preset,
  images: ["public/logo.svg"],
});
