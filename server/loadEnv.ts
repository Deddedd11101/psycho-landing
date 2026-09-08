/**
 * Загрузка переменных окружения из корневого .env.
 *
 * Импортировать этот модуль нужно ПЕРВЫМ — до config.ts, потому что config
 * читает process.env в момент импорта. ESM выполняет модули в порядке импортов,
 * поэтому достаточно поставить строку `import '../../server/loadEnv.js';` наверху файла.
 *
 * На Vercel файла .env нет — переменные приходят из настроек проекта, и это нормально:
 * dotenv просто ничего не найдёт и не будет ругаться.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// server/ лежит в корне репозитория, поэтому .env — на уровень выше.
dotenv.config({ path: path.resolve(currentDir, '../.env') });
