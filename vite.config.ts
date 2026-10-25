import { defineConfig } from 'vite'

// Chemins relatifs : le site marche à la racine d'un domaine comme dans un sous-dossier (GitHub Pages : /ISTB/).
export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
})
