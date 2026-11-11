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
    target: 'es2022',
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
