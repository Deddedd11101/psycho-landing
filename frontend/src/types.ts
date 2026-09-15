/**
 * Типы фронтенда.
 * Общие с сервером структуры (анкета, слот, ответы API) импортируются из @shared/types,
 * чтобы клиент и сервер не разъезжались.
 */

import type { SessionFormat } from '@shared/types';

export type { BookingSlot, ClientForm, Intent, SessionFormat, SubmitFormResponse } from '@shared/types';

/**
 * Состояние воронки: выбранное время и короткая анкета.
 * Пол и возраст на сайте не спрашиваем — это обсуждается на встрече.
 */
export interface WizardData {
  name: string;
  /** Направления — необязательная подсказка для специалиста. */
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
 * Экран, который сейчас показывает воронка:
 * calendar (шаг 1) → form (шаг 2) → sending → success | error.
 */
export type WizardScreen = 'calendar' | 'form' | 'sending' | 'success' | 'error';
