/**
 * Express-сервер для локальной разработки и для деплоя на обычный VPS.
 *
 * На Vercel этот файл не используется — там работают serverless-функции из /api,
 * но обработчики маршрутов у них общие (../../server/routes.ts), так что поведение совпадает.
 *
 * Дополнительно (если USE_POLLING=true) сервер поднимает бота в режиме long-polling
 * в том же процессе. Это важно: при хранилище «в памяти» бот и API должны жить вместе,
 * иначе бот не увидит заявки, созданные сайтом.
 */

// Переменные окружения должны загрузиться до импорта config.ts.
import '../../server/loadEnv.js';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { config, missingTelegramConfig } from '../../server/config.js';
import { startPolling } from '../../server/polling.js';
import {
  handleBooking,
  handleGetSession,
  handleSubmitForm,
  handleTelegramWebhook,
} from '../../server/routes.js';
import { sessionStore } from '../../server/store.js';

const app = express();

// Тела запросов — JSON. Лимит небольшой: анкета весит считанные килобайты.
app.use(express.json({ limit: '100kb' }));

// Простое логирование запросов — помогает при отладке воронки.
app.use((req, _res, next) => {
  console.log(`[http] ${req.method} ${req.url}`);
  next();
});

/** Проверка живости сервиса. */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    store: sessionStore.kind,
    telegramConfigured: missingTelegramConfig().length === 0,
  });
});

app.all('/api/submit-form', (req, res) => {
  void handleSubmitForm(req, res as never);
});

app.all('/api/session/:id', (req, res) => {
  void handleGetSession(req.params.id, req, res as never);
});

app.all('/api/booking', (req, res) => {
  void handleBooking(req, res as never);
});

app.post('/api/telegram/webhook', (req, res) => {
  void handleTelegramWebhook(req, res as never);
});

/**
 * Раздача собранного фронтенда.
 * Нужна только при деплое на VPS (npm run build && npm start).
 * В dev-режиме фронтенд отдаёт Vite на порту 5173.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(currentDir, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA-фолбэк: любой не-API маршрут отдаёт index.html.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) {
      res.status(404).send('Фронтенд не собран. Выполните: npm run build');
    }
  });
});

app.listen(config.port, () => {
  console.log(`[server] API слушает http://localhost:${config.port}`);
  console.log(`[server] Хранилище сессий: ${sessionStore.kind}`);

  const missing = missingTelegramConfig();
  if (missing.length > 0) {
    console.warn(`[server] ⚠ Не заданы переменные: ${missing.join(', ')} — отправка в Telegram работать не будет`);
    return;
  }

  // Бот в том же процессе — видит те же заявки, что и API.
  if (config.usePolling) {
    startPolling();
  } else {
    console.log('[server] Polling выключен (USE_POLLING=false) — ожидается вебхук');
  }
});
