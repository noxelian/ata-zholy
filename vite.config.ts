import { defineConfig } from 'vite'

// GitHub Pages serves the site from /ata-zholy/. Override with BASE=/ for a root domain.
export default defineConfig({
  base: process.env.BASE ?? '/ata-zholy/',
})
