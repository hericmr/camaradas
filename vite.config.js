import { defineConfig } from 'vite';

export default defineConfig({
  base: '/camaradas/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
