/**
 * Клиент API. Единственное место, где фронтенд ходит на сервер.
 */

import type { BookingSlot, ClientForm, Intent, SlotsResponse, SubmitFormResponse } from '@shared/types';

/**
 * Базовый адрес API.
 * Пусто — значит тот же домен: в dev-режиме запросы уходят на Vite-прокси,
 * а в продакшне на Vercel фронтенд и функции живут на одном домене.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Ошибка API с разбором ответа сервера. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    /** Ошибки по полям формы, если сервер их вернул. */
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Загружает расписание специалиста и занятое время.
 * Возвращает null при сбое — календарь тогда строится по расписанию по умолчанию,
 * а занятость всё равно проверяется на сервере в момент отправки заявки.
 */
export async function fetchSlots(): Promise<SlotsResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/slots`);
    if (!response.ok) return null;
    return (await response.json()) as SlotsResponse;
  } catch {
    return null;
  }
}

/** Тело запроса на создание заявки. */
export interface SubmitPayload {
  intent: Intent;
  form: ClientForm;
  slot?: BookingSlot;
}

/**
 * Отправляет анкету на сервер и получает ссылку на Telegram-бота.
 * Ссылку нужно открыть — именно по ней бот узнает chat_id клиента.
 */
export async function submitForm(payload: SubmitPayload): Promise<SubmitFormResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/submit-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Сюда попадаем при обрыве сети или недоступном сервере.
    throw new ApiRequestError('Не удалось связаться с сервером. Проверьте интернет-соединение и попробуйте ещё раз.');
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Пустой или не-JSON ответ обрабатываем ниже как ошибку сервера.
  }

  if (!response.ok) {
    const payloadError = (data ?? {}) as { error?: string; details?: Record<string, string> };
    throw new ApiRequestError(
      payloadError.error ?? 'Что-то пошло не так. Попробуйте ещё раз.',
      payloadError.details,
    );
  }

  return data as SubmitFormResponse;
}
