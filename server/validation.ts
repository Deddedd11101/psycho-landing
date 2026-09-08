/**
 * Валидация данных, приходящих с фронтенда.
 * Пишем руками, без zod: правил немного, а лишняя зависимость на сервере не нужна.
 * Клиент валидирует те же поля — здесь защита от прямых запросов в API.
 */

import type { BookingSlot, ClientForm, Intent, SubmitFormRequest } from './types.js';

/** Результат валидации: либо данные, либо словарь ошибок по полям. */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

const GENDERS = new Set(['female', 'male', 'other']);
const FORMATS = new Set(['online', 'offline']);
const INTENTS = new Set(['contact', 'booking']);

/** Максимальные длины текстовых полей — защита от «мусорных» запросов. */
const LIMITS = {
  name: 60,
  phone: 30,
  customTopic: 120,
  request: 1500,
} as const;

/** Приводит значение к строке и обрезает пробелы. */
function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Проверяет анкету клиента. */
export function validateForm(input: unknown): ValidationResult<ClientForm> {
  const errors: Record<string, string> = {};
  const raw = (input ?? {}) as Record<string, unknown>;

  const name = str(raw.name);
  if (name.length < 2) {
    errors.name = 'Укажите имя (минимум 2 символа)';
  } else if (name.length > LIMITS.name) {
    errors.name = `Имя слишком длинное (максимум ${LIMITS.name} символов)`;
  }

  const gender = str(raw.gender);
  if (!GENDERS.has(gender)) {
    errors.gender = 'Выберите один из вариантов';
  }

  const age = Number(raw.age);
  if (!Number.isFinite(age) || !Number.isInteger(age)) {
    errors.age = 'Возраст должен быть числом';
  } else if (age < 16 || age > 100) {
    errors.age = 'Возраст должен быть от 16 до 100 лет';
  }

  const topicsRaw = Array.isArray(raw.topics) ? raw.topics : [];
  const topics = topicsRaw.filter((item): item is string => typeof item === 'string');
  const customTopic = str(raw.customTopic);
  if (topics.length === 0 && customTopic.length === 0) {
    errors.topics = 'Выберите хотя бы одно направление или впишите свой вариант';
  }
  if (customTopic.length > LIMITS.customTopic) {
    errors.customTopic = `Слишком длинно (максимум ${LIMITS.customTopic} символов)`;
  }

  const request = str(raw.request);
  if (request.length > LIMITS.request) {
    errors.request = `Слишком длинный текст (максимум ${LIMITS.request} символов)`;
  }

  const phone = str(raw.phone);
  // Телефон необязателен, но если указан — проверяем формат мягко: цифры, +, скобки, дефисы.
  if (phone.length > 0) {
    if (phone.length > LIMITS.phone) {
      errors.phone = 'Слишком длинный номер';
    } else if (!/^\+?[\d\s()-]{7,}$/.test(phone)) {
      errors.phone = 'Проверьте номер телефона';
    }
  }

  if (raw.consent !== true) {
    errors.consent = 'Без согласия на обработку данных мы не можем принять заявку';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      gender: gender as ClientForm['gender'],
      age,
      topics,
      ...(customTopic ? { customTopic } : {}),
      ...(request ? { request } : {}),
      ...(phone ? { phone } : {}),
      consent: true,
    },
  };
}

/** Проверяет выбранный слот записи. */
function validateSlot(input: unknown): ValidationResult<BookingSlot> {
  const errors: Record<string, string> = {};
  const raw = (input ?? {}) as Record<string, unknown>;

  const date = str(raw.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Выберите дату';
  }

  const time = str(raw.time);
  if (!/^\d{2}:\d{2}$/.test(time)) {
    errors.time = 'Выберите время';
  }

  const format = str(raw.format);
  if (!FORMATS.has(format)) {
    errors.format = 'Выберите формат встречи';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { date, time, format: format as BookingSlot['format'] } };
}

/** Проверяет всё тело запроса POST /api/submit-form. */
export function validateSubmitRequest(input: unknown): ValidationResult<SubmitFormRequest> {
  const raw = (input ?? {}) as Record<string, unknown>;
  const intent = str(raw.intent);

  if (!INTENTS.has(intent)) {
    return { ok: false, errors: { intent: 'Неизвестное действие' } };
  }

  const form = validateForm(raw.form);
  if (!form.ok) return form;

  // Слот обязателен только для записи на конкретное время.
  if (intent === 'booking') {
    const slot = validateSlot(raw.slot);
    if (!slot.ok) return slot;
    return { ok: true, value: { intent: intent as Intent, form: form.value, slot: slot.value } };
  }

  return { ok: true, value: { intent: intent as Intent, form: form.value } };
}
