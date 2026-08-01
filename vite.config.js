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
        carimboSantosPoderes: resolve(process.cwd(), 'jogos/carimbo-santos-poderes.html'),
        carimboSantosPoliticas: resolve(process.cwd(), 'jogos/carimbo-santos-politicas.html'),
        carimboSantosPegadinhas: resolve(process.cwd(), 'jogos/carimbo-santos-pegadinhas.html'),
        carimboSantosNumeros: resolve(process.cwd(), 'jogos/carimbo-santos-numeros.html'),
        carimboSantosAssistencia: resolve(process.cwd(), 'jogos/carimbo-santos-assistencia.html'),
        carimboProgresso: resolve(process.cwd(), 'jogos/carimbo-progresso.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
