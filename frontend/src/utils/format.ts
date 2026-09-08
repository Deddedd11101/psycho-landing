/**
 * Небольшие помощники форматирования текста для интерфейса.
 */

/**
 * Склоняет слово «год» по числу: 21 год, 22 года, 25 лет.
 * Такая же логика есть на сервере (server/messages.ts) — для сообщений в Telegram.
 */
export function ageWord(age: number): string {
  const lastTwo = age % 100;
  const last = age % 10;

  // 11–14 — исключение: всегда «лет».
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
}

/** Возраст с правильным словом: «34 года». Пустая строка, если возраст не указан. */
export function formatAge(rawAge: string): string {
  const age = Number(rawAge);
  if (!Number.isFinite(age) || age <= 0) return '';
  return `${age} ${ageWord(age)}`;
}
