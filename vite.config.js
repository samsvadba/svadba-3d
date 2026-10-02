import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/svadba-3d/',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v3: fileURLToPath(new URL('./index-v3.html', import.meta.url))
      }
    }
  }
})

