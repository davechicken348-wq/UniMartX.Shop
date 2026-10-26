import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        app: fromRoot('./index.html'),
      },
    },
  },
});
