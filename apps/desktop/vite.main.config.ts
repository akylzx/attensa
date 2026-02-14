import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig({
  resolve: {
    conditions: ['node'],
  },
  build: {
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'active-win',
        '@google/genai',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
});
