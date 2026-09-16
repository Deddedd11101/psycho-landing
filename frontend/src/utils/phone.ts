/**
 * Маска российского номера: «+7 (9XX) XXX-XX-XX».
 * Человек начинает вводить сразу с 9 — «+7» подставляется автоматически.
 */

/** Оставляет только цифры и приводит первую к «7»: 8 → 7, 9… → 79… */
function normalizeDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.startsWith('9')) digits = `7${digits}`;
  // 7 + 10 цифр номера — больше не бывает.
  return digits.slice(0, 11);
}

/** Форматирует «сырой» ввод в «+7 (999) 123-45-67». Пустой ввод остаётся пустым. */
export function formatPhone(value: string): string {
  const digits = normalizeDigits(value);
  if (digits.length === 0) return '';

  const rest = digits.slice(1);
  let result = '+7';
  if (rest.length > 0) result += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) result += ')';
  if (rest.length > 3) result += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) result += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) result += `-${rest.slice(8, 10)}`;
  return result;
}

/** Значение при фокусе на пустом поле — чтобы сразу набирать код оператора. */
export const PHONE_PREFIX = '+7 (';
