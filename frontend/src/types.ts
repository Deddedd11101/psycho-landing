/**
 * Типы фронтенда.
 * Общие с сервером структуры (анкета, слот, ответы API) импортируются из @shared/types,
 * чтобы клиент и сервер не разъезжались.
 */

import type { Gender, SessionFormat } from '@shared/types';

export type { BookingSlot, ClientForm, Gender, Intent, SessionFormat, SubmitFormResponse } from '@shared/types';

/**
 * Состояние воронки.
 * Отличается от ClientForm тем, что поля ввода хранятся строками:
 * так проще управлять «сырым» вводом (например, пустым полем возраста).
 */
export interface WizardData {
  name: string;
  /** Пустая строка — вариант ещё не выбран. */
  gender: Gender | '';
  age: string;
  topics: string[];
  customTopic: string;
  request: string;
  phone: string;
  consent: boolean;
  /** Выбранная дата приёма (YYYY-MM-DD), пусто — не выбрана. */
  bookingDate: string;
  /** Выбранное время (HH:mm). */
  bookingTime: string;
  format: SessionFormat;
}

/** Пустая анкета — с неё начинается воронка. */
export const emptyWizardData: WizardData = {
  name: '',
  gender: '',
  age: '',
  topics: [],
  customTopic: '',
  request: '',
  phone: '',
  consent: false,
  bookingDate: '',
  bookingTime: '',
  format: 'online',
};

/**
 * Экран, который сейчас показывает воронка.
 * Шаги 1–4 — анкета, дальше — выбор времени и результат.
 */
export type WizardScreen = 'form' | 'calendar' | 'sending' | 'success' | 'error';
