/**
 * Клиентская валидация шагов воронки.
 *
 * Те же правила продублированы на сервере (server/validation.ts) — здесь они
 * нужны для мгновенной подсказки пользователю, а на сервере для защиты API.
 */

import type { WizardData } from '../types';

/** Ошибки по именам полей. Пустой объект — шаг заполнен корректно. */
export type FieldErrors = Record<string, string>;

/** Шаг 1 — личные данные. */
export function validatePersonalStep(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};

  if (data.name.trim().length < 2) {
    errors.name = 'Как к вам обращаться? Достаточно имени';
  } else if (data.name.trim().length > 60) {
    errors.name = 'Слишком длинное имя';
  }

  if (!data.gender) {
    errors.gender = 'Выберите вариант';
  }

  const age = Number(data.age);
  if (data.age.trim() === '') {
    errors.age = 'Укажите возраст';
  } else if (!Number.isInteger(age)) {
    errors.age = 'Возраст — это целое число';
  } else if (age < 18 || age > 100) {
    errors.age = 'Я работаю только со взрослыми — от 18 лет';
  }

  // Телефон необязателен, но если начали вводить — проверяем.
  const phone = data.phone.trim();
  if (phone.length > 0 && !/^\+?[\d\s()-]{7,}$/.test(phone)) {
    errors.phone = 'Проверьте номер: только цифры, пробелы, скобки и дефисы';
  }

  return errors;
}

/** Шаг 2 — направления работы. */
export function validateTopicsStep(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};

  if (data.topics.length === 0 && data.customTopic.trim().length === 0) {
    errors.topics = 'Отметьте хотя бы один пункт или впишите свой вариант';
  }

  if (data.customTopic.trim().length > 120) {
    errors.customTopic = 'Слишком длинно — уложитесь в 120 символов';
  }

  return errors;
}

/** Шаг 3 — описание запроса (полностью необязательный). */
export function validateRequestStep(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};

  if (data.request.trim().length > 1500) {
    errors.request = 'Слишком длинный текст — уложитесь в 1500 символов';
  }

  return errors;
}

/** Шаг 4 — согласие на обработку данных перед отправкой. */
export function validateFinalStep(data: WizardData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.consent) {
    errors.consent = 'Нужно согласие на обработку данных — без него мы не можем принять заявку';
  }

  return errors;
}

/** Валидация шага по его номеру (1–4). */
export function validateStep(step: number, data: WizardData): FieldErrors {
  switch (step) {
    case 1:
      return validatePersonalStep(data);
    case 2:
      return validateTopicsStep(data);
    case 3:
      return validateRequestStep(data);
    case 4:
      return validateFinalStep(data);
    default:
      return {};
  }
}
