import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  // Use relative asset paths so the built bundle works when loaded via file://
  // inside Electron (production). Without this, /assets/* resolves to the
  // filesystem root and JS/CSS 404 — the page stays blank and the transparent
  // Electron window becomes fully invisible.
  base: './',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
