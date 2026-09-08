/**
 * Хранение данных воронки с черновиком в localStorage.
 *
 * Зачем черновик: анкету заполняют с телефона, и случайное закрытие вкладки
 * не должно стирать введённое. Данные хранятся только в браузере клиента
 * и удаляются после успешной отправки.
 */

import { useCallback, useEffect, useState } from 'react';

import { emptyWizardData, type WizardData } from '../types';

const STORAGE_KEY = 'psycho-wizard-draft';

/** Читает черновик из localStorage. Любая ошибка означает «черновика нет». */
function readDraft(): WizardData {
  if (typeof window === 'undefined') return emptyWizardData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWizardData;

    const parsed = JSON.parse(raw) as Partial<WizardData>;
    // Разворачиваем поверх пустой анкеты: так новые поля не сломают старый черновик.
    return { ...emptyWizardData, ...parsed };
  } catch {
    return emptyWizardData;
  }
}

export interface WizardState {
  data: WizardData;
  /** Частичное обновление полей. */
  update: (patch: Partial<WizardData>) => void;
  /** Полный сброс анкеты и удаление черновика. */
  reset: () => void;
}

export function useWizardState(): WizardState {
  const [data, setData] = useState<WizardData>(readDraft);

  // Сохраняем черновик при каждом изменении.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Приватный режим браузера может запрещать запись — это не критично.
    }
  }, [data]);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((previous) => ({ ...previous, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setData(emptyWizardData);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Игнорируем: очистка черновика не влияет на работу воронки.
    }
  }, []);

  return { data, update, reset };
}
