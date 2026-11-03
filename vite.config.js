import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { rootRedirect } from './scripts/root-redirect.mjs'

export default defineConfig({
  base: '/svadba-3d/',
  plugins: [{
    name: 'v3-root-redirect',
    generateBundle() {
      // Keep existing root links usable without building a second experience.
      this.emitFile({ type: 'asset', fileName: 'index.html', source: rootRedirect(readFileSync(fileURLToPath(new URL('./index-v3.html', import.meta.url)), 'utf8')) })
    }
  }],
  build: {
    rollupOptions: {
      input: { v3: fileURLToPath(new URL('./index-v3.html', import.meta.url)) }
    }
  }
})
