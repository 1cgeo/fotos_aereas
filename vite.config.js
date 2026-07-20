import { defineConfig } from 'vite';

export default defineConfig({
  // Base RELATIVA por padrão: o portal é servido tanto na raiz de um host quanto
  // num subcaminho (http://host/fotos_aereas/), e com base absoluta os assets
  // apontariam para a raiz do servidor e não carregariam no subcaminho.
  // Relativo dispensa saber o caminho no momento do build.
  base: process.env.VITE_BASE_PATH || './',
  build: {
    sourcemap: false,
    target: 'es2022'
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
});

