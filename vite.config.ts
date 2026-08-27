import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the same build works at the domain root (dev) and
  // under a subpath (GitHub Pages serves at /<repo>/).
  base: './',
  // Tiny stamp on the start screen, so "are you on the new version?" is
  // answerable by reading the corner of the screen.
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(5, 16).replace('T', ' ')),
  },
})
