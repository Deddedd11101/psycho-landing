/**
 * Клиентская валидация воронки.
 *
 * Те же правила продублированы на сервере (server/validation.ts) — здесь они
 * нужны для мгновенной подсказки пользователю, а на сервере для защиты API.
 */

import type { WizardData } from '../types';

/** Ошибки по именам полей. Пустой объект — всё заполнено корректно. */
export type FieldErrors = Record<string, string>;

/** Шаг 1 — выбор времени (только для записи, не для «написать без записи»). */
export function validateSlot(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.bookingDate || !data.bookingTime) {
    errors.slot = 'Выберите дату и время встречи';
  }
  return errors;
}

/** Шаг 2 — короткая анкета и согласие. */
export function validateDetails(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};

  const name = data.name.trim();
  if (name.length < 2) {
    errors.name = 'Как к вам обращаться? Достаточно имени';
  } else if (name.length > 60) {
    errors.name = 'Слишком длинное имя';
  }

  // Телефон необязателен, но если начали вводить — проверяем.
  const phone = data.phone.trim();
  if (phone.length > 0 && !/^\+?[\d\s()-]{7,}$/.test(phone)) {
    errors.phone = 'Проверьте номер: только цифры, пробелы, скобки и дефисы';
  }

  if (data.customTopic.trim().length > 120) {
    errors.customTopic = 'Слишком длинно — уложитесь в 120 символов';
  }

  if (data.request.trim().length > 1500) {
    errors.request = 'Слишком длинный текст — уложитесь в 1500 символов';
  }

  if (!data.consent) {
    errors.consent = 'Нужно согласие на обработку данных — без него мы не можем принять заявку';
  }

  return errors;
}
