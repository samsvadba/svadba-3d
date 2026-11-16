import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/svadba-3d/',
  plugins: [{
    name: 'v3-root-entry',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index-v3.html']
        if (page?.type !== 'asset') this.error('Missing built V3 page')
        this.emitFile({ type: 'asset', fileName: 'index.html', source: page.source })
      }
    }
  }],
  build: {
    rollupOptions: {
      input: { v3: fileURLToPath(new URL('./index-v3.html', import.meta.url)) }
    }
  }
})
