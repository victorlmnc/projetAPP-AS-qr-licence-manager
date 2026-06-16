import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // jspdf a des dépendances optionnelles SVG qu'on n'utilise pas
      external: ['canvg', 'html2canvas', 'dompurify'],
    },
  },
  test: {
    environment: 'node',
  },
});
