/**
 * Форматирование дат и подписей для Mini App.
 */

import { GENDER_LABELS, FORMAT_LABELS, topicLabel } from '@shared/topics';
import type { SessionRecord, SessionStatus } from '@shared/types';

import { ageWord } from '../utils/format';

/** YYYY-MM-DD в локальном времени. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Сдвиг даты на N дней. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** «Ср, 16 сентября» из YYYY-MM-DD; сегодня/завтра подписываются словами. */
export function formatDayTitle(isoDate: string, today: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const label = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }).format(date);
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  if (isoDate === today) return `Сегодня · ${capitalized}`;
  if (isoDate === toDateKey(addDays(new Date(), 1))) return `Завтра · ${capitalized}`;
  return capitalized;
}

/** «16 сент., 14:05» для момента создания заявки. */
export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(
    new Date(ms),
  );
}

/** Подпись и цвет статуса. */
export function statusMeta(status: SessionStatus): { label: string; tone: 'pending' | 'confirmed' | 'cancelled' } {
  switch (status) {
    case 'confirmed':
      return { label: 'Подтверждена', tone: 'confirmed' };
    case 'cancelled':
      return { label: 'Отменена', tone: 'cancelled' };
    default:
      return { label: 'Ждёт подтверждения', tone: 'pending' };
  }
}

/** «Женский, 34 года». */
export function describePerson(record: SessionRecord): string {
  return `${GENDER_LABELS[record.form.gender] ?? record.form.gender}, ${record.form.age} ${ageWord(record.form.age)}`;
}

/** Список направлений через запятую. */
export function describeTopics(record: SessionRecord): string {
  const items = record.form.topics.map(topicLabel);
  if (record.form.customTopic) items.push(record.form.customTopic);
  return items.join(', ') || '—';
}

export function describeFormat(record: SessionRecord): string {
  return record.slot ? (FORMAT_LABELS[record.slot.format] ?? record.slot.format) : '';
}

/** Ссылка на чат с клиентом, если он подтвердил заявку в боте. */
export function clientChatLink(record: SessionRecord): string | null {
  if (!record.client) return null;
  return record.client.username ? `https://t.me/${record.client.username}` : `tg://user?id=${record.client.chatId}`;
}

/** Подписи дней недели для настройки расписания (ключи — как у getDay()). */
export const WEEKDAYS: { key: string; label: string; short: string }[] = [
  { key: '1', label: 'Понедельник', short: 'Пн' },
  { key: '2', label: 'Вторник', short: 'Вт' },
  { key: '3', label: 'Среда', short: 'Ср' },
  { key: '4', label: 'Четверг', short: 'Чт' },
  { key: '5', label: 'Пятница', short: 'Пт' },
  { key: '6', label: 'Суббота', short: 'Сб' },
  { key: '0', label: 'Воскресенье', short: 'Вс' },
];
