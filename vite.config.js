import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/camaradas/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        carimboEtica: resolve(process.cwd(), 'jogos/carimbo-etica.html'),
        carimbo8662: resolve(process.cwd(), 'jogos/carimbo-8662.html'),
        carimboCompleto: resolve(process.cwd(), 'jogos/carimbo-completo.html'),
        carimboSantos: resolve(process.cwd(), 'jogos/carimbo-santos.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
