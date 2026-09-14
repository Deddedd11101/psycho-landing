/**
 * Запросы Mini App к /api/admin/*.
 * Авторизация: initData из Telegram (заголовок x-telegram-init-data) либо,
 * для отладки в браузере, токен из адресной строки (?token=...).
 */

import type { ScheduleSettings, SessionRecord, SessionStatus } from '@shared/types';

import { getWebApp } from './telegram';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Заявка в том виде, в каком её отдаёт /api/admin/*. */
export interface AdminSession extends SessionRecord {
  status: SessionStatus;
  telegramLink: string;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

/** Заголовки авторизации в зависимости от окружения. */
function authHeaders(): Record<string, string> {
  const app = getWebApp();
  if (app) return { 'x-telegram-init-data': app.initData };

  const token = new URLSearchParams(window.location.search).get('token');
  return token ? { 'x-admin-token': token } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers ?? {}) },
    });
  } catch {
    throw new AdminApiError('Нет связи с сервером. Проверьте интернет.', 0);
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new AdminApiError(data.error ?? `Ошибка ${response.status}`, response.status);
  }
  return data;
}

/** Записи с датой встречи в диапазоне. */
export async function fetchBookings(from: string, to: string): Promise<AdminSession[]> {
  const data = await request<{ sessions: AdminSession[] }>(`/api/admin/bookings?from=${from}&to=${to}`);
  return data.sessions;
}

/** Обращения без выбранного времени. */
export async function fetchInbox(): Promise<AdminSession[]> {
  const data = await request<{ sessions: AdminSession[] }>('/api/admin/inbox');
  return data.sessions;
}

/** Отмена записи. */
export async function cancelBooking(id: string): Promise<AdminSession> {
  const data = await request<{ session: AdminSession }>('/api/admin/cancel', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return data.session;
}

export async function fetchSchedule(): Promise<ScheduleSettings> {
  const data = await request<{ schedule: ScheduleSettings }>('/api/admin/schedule');
  return data.schedule;
}

export async function saveSchedule(schedule: ScheduleSettings): Promise<ScheduleSettings> {
  const data = await request<{ schedule: ScheduleSettings }>('/api/admin/schedule', {
    method: 'PUT',
    body: JSON.stringify({ schedule }),
  });
  return data.schedule;
}
