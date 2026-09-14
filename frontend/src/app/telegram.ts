/**
 * Тонкая обёртка над SDK Telegram Mini Apps (window.Telegram.WebApp).
 * Всё, что зависит от Telegram, собрано здесь — остальной код Mini App
 * работает и в обычном браузере (для отладки с ?token=...).
 */

/** Минимальное описание SDK — только то, что используем. */
interface TelegramWebApp {
  initData: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string | undefined>;
  ready(): void;
  expand(): void;
  showConfirm(message: string, callback: (confirmed: boolean) => void): void;
  showAlert(message: string, callback?: () => void): void;
  openTelegramLink(url: string): void;
  HapticFeedback?: { notificationOccurred(type: 'success' | 'warning' | 'error'): void };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** SDK, если страница открыта внутри Telegram. */
export function getWebApp(): TelegramWebApp | null {
  const app = window.Telegram?.WebApp;
  // Вне Telegram объект тоже существует, но initData пустой.
  return app && app.initData ? app : null;
}

/** Сообщаем Telegram, что приложение готово, и раскрываем его на весь экран. */
export function initTelegram(): void {
  const app = window.Telegram?.WebApp;
  if (!app) return;
  app.ready();
  app.expand();
  // Тёмная тема Telegram — переключаем палитру.
  document.documentElement.dataset.theme = app.colorScheme;
}

/** Диалог подтверждения: нативный в Telegram, window.confirm в браузере. */
export function confirmDialog(message: string): Promise<boolean> {
  const app = getWebApp();
  if (!app) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => app.showConfirm(message, resolve));
}

/** Уведомление об ошибке. */
export function alertDialog(message: string): void {
  const app = getWebApp();
  if (!app) {
    window.alert(message);
    return;
  }
  app.showAlert(message);
}

/** Лёгкая вибрация на успех/ошибку (только в Telegram). */
export function haptic(type: 'success' | 'warning' | 'error'): void {
  getWebApp()?.HapticFeedback?.notificationOccurred(type);
}

/** Открывает ссылку на чат: внутри Telegram — без выхода из приложения. */
export function openChat(url: string): void {
  const app = getWebApp();
  if (app && url.startsWith('https://t.me/')) {
    app.openTelegramLink(url);
    return;
  }
  window.open(url, '_blank', 'noreferrer');
}
