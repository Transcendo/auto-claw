import { builtinModules } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      entry: {
        index: resolve(rootDir, 'src/index.ts'),
        db: resolve(rootDir, 'src/db.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'better-sqlite3',
        'drizzle-orm',
        'drizzle-orm/better-sqlite3',
        ...builtinModules,
        ...builtinModules.map((module) => `node:${module}`),
      ],
    },
    minify: false,
    sourcemap: true,
  },
})
