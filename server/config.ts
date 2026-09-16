/**
 * Чтение и валидация переменных окружения.
 * Все обращения к process.env собраны здесь, чтобы остальной код не знал об окружении.
 */

/** Возвращает значение переменной окружения или undefined, если она пуста. */
function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Читает булеву переменную окружения ('true'/'1' — истина). */
function envBool(name: string, fallback = false): boolean {
  const value = env(name);
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

/** Читает числовую переменную окружения с запасным значением. */
function envNumber(name: string, fallback: number): number {
  const value = env(name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  /** Токен бота от @BotFather. */
  botToken: env('BOT_TOKEN'),
  /** Username бота без @ — нужен для deep-link. */
  botUsername: env('BOT_USERNAME') ?? 'darwinapsybot',
  /** Числовой chat_id психолога — получатель заявок. */
  psychologistChatId: env('PSYCHOLOGIST_CHAT_ID'),
  /** Публичный username психолога (без @) для ссылки клиенту. */
  psychologistUsername: env('PSYCHOLOGIST_USERNAME') ?? 'darwina_sonia',
  /** Имя специалиста — подставляется в тексты бота. */
  psychologistName: env('PSYCHOLOGIST_NAME') ?? 'психолог',

  /**
   * Постоянная ссылка на онлайн-встречу (если есть). Пусто — специалист присылает
   * ссылку на видеозвонок сам перед каждой встречей, и бот так и говорит клиенту.
   */
  meetingLink: env('MEETING_LINK'),
  /** Адрес очного приёма. */
  officeAddress: env('OFFICE_ADDRESS') ?? 'адрес уточним в переписке',

  /** Порт локального Express-сервера. */
  port: envNumber('PORT', 3001),
  /** Публичный адрес сайта. */
  publicUrl: env('PUBLIC_URL') ?? 'http://localhost:5173',

  /** Секрет для служебных эндпоинтов. Пусто — проверка отключена. */
  internalApiToken: env('INTERNAL_API_TOKEN'),
  /** Секрет вебхука Telegram. */
  webhookSecret: env('TELEGRAM_WEBHOOK_SECRET'),
  /** Запускать ли long-polling вместе с Express-сервером. */
  usePolling: envBool('USE_POLLING', true),

  /** Настройки Upstash Redis (опционально, для Vercel). */
  upstashUrl: env('UPSTASH_REDIS_REST_URL'),
  upstashToken: env('UPSTASH_REDIS_REST_TOKEN'),

  /**
   * Тип хранилища: 'sqlite' (по умолчанию) или 'memory' (только для разработки).
   * Upstash включается автоматически при наличии UPSTASH_* и имеет приоритет.
   */
  storeKind: (env('STORE') === 'memory' ? 'memory' : 'sqlite') as 'memory' | 'sqlite',
  /** Путь к файлу базы SQLite. По умолчанию — data/psycho.db в корне проекта. */
  dbPath: env('DB_PATH') ?? 'data/psycho.db',

  /** Время жизни сессии в секундах. */
  sessionTtlSeconds: envNumber('SESSION_TTL_SECONDS', 60 * 60 * 24),
} as const;

/** Ссылка-приглашение в бота с идентификатором сессии (deep-link). */
export function buildBotDeepLink(sessionId: string): string {
  return `https://t.me/${config.botUsername}?start=${sessionId}`;
}

/** Прямая ссылка на личный аккаунт психолога. */
export function buildPsychologistLink(): string {
  return `https://t.me/${config.psychologistUsername}`;
}

/**
 * Адрес Mini App специалиста. Telegram открывает Mini App только по HTTPS,
 * поэтому возвращаем null, пока сайт работает по http.
 */
export function buildMiniAppUrl(): string | null {
  const base = config.publicUrl.replace(/\/$/, '');
  return base.startsWith('https://') ? `${base}/app` : null;
}

/**
 * Проверяет, что заданы минимально необходимые переменные для работы с Telegram.
 * Возвращает список отсутствующих переменных (пустой массив — всё в порядке).
 */
export function missingTelegramConfig(): string[] {
  const missing: string[] = [];
  if (!config.botToken) missing.push('BOT_TOKEN');
  if (!config.psychologistChatId) missing.push('PSYCHOLOGIST_CHAT_ID');
  return missing;
}
