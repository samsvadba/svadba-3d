import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/svadba-3d/',
  plugins: [{
    name: 'v3-root-redirect',
    generateBundle() {
      // Keep existing root links usable without building a second experience.
      this.emitFile({ type: 'asset', fileName: 'index.html', source: '<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./index-v3.html"><link rel="canonical" href="https://samsvadba.github.io/svadba-3d/index-v3.html"><title>Simona &amp; Martin</title></head><body><a href="./index-v3.html">Simona &amp; Martin</a></body></html>' })
    }
  }],
  build: {
    rollupOptions: {
      input: { v3: fileURLToPath(new URL('./index-v3.html', import.meta.url)) }
    }
  }
})
