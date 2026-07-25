import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/camaradas/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        carimbo: resolve(process.cwd(), 'jogos/carimbo-8662.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
