import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      entry: resolve(rootDir, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((module) => `node:${module}`)],
    },
    minify: false,
    sourcemap: true,
  },
})
