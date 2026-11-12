/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Sous-dossier de publication (GitHub Pages : /gloriousdestiny/). Racine par défaut.
  base: process.env['BASE_PATH'] ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: false },
  preview: { port: 4173 },
  build: {
    sourcemap: false,
    // Téléphones plus anciens (iPhone sous iOS 15, Chrome des Android de 2022) : le code est
    // réécrit pour eux. En dessous, les styles ne s'appliquent plus (couches CSS) : index.html
    // affiche alors un message et le contact WhatsApp au lieu d'une page vide.
    target: ['es2020', 'chrome99', 'edge99', 'firefox97', 'safari15'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Copies de travail des agents (.claude/worktrees) : jamais testées depuis ici.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'e2e/**'],
    // Les tests n'appellent jamais le vrai projet Supabase.
    env: {
      VITE_SUPABASE_URL: 'https://projet-test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_cle_de_test',
    },
  },
})
