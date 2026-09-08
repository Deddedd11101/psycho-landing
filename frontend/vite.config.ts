import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Файл .env лежит в корне репозитория (а не в frontend/), поэтому явно
  // указываем Vite, где искать переменные VITE_*.
  envDir: path.resolve(currentDir, '..'),
  resolve: {
    alias: {
      // Общий с сервером код (справочник направлений и типы данных).
      '@shared': path.resolve(currentDir, '../server'),
    },
  },
  server: {
    port: 5173,
    // Разрешаем Vite читать файлы на уровень выше корня фронтенда (папка ../server).
    fs: { allow: [path.resolve(currentDir, '..')] },
    // Все запросы /api/* уходят на локальный Express-сервер.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
