/**
 * Переиспользуемые элементы форм воронки: текстовое поле, textarea,
 * карточка-вариант (радио/чекбокс) и сообщение об ошибке.
 * Все элементы связаны с подписями через htmlFor/id и помечены aria-атрибутами.
 */

import type { ChangeEvent, ReactNode } from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** Показать пометку «необязательно» рядом с подписью. */
  optional?: boolean;
  type?: 'text' | 'tel' | 'number';
  inputMode?: 'text' | 'tel' | 'numeric';
  maxLength?: number;
  autoFocus?: boolean;
}

/** Однострочное текстовое поле с подписью и ошибкой. */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  optional,
  type = 'text',
  inputMode,
  maxLength,
  autoFocus,
}: TextFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">необязательно</span>}
      </label>
      <input
        id={id}
        className={`field__control${error ? ' field__control--error' : ''}`}
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- фокус на первом поле шага ускоряет заполнение
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
  maxLength: number;
}

/** Многострочное поле со счётчиком символов. */
export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  optional,
  maxLength,
}: TextAreaFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional">необязательно</span>}
      </label>
      <textarea
        id={id}
        className={`field__control${error ? ' field__control--error' : ''}`}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
      />
      <div className="field__counter">
        {value.length} / {maxLength}
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

interface OptionCardProps {
  /** radio — можно выбрать один вариант, checkbox — несколько. */
  type: 'radio' | 'checkbox';
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  hint?: string;
}

/** Карточка-вариант ответа: крупная зона нажатия вместо мелкого нативного элемента. */
export function OptionCard({ type, name, value, checked, onChange, label, hint }: OptionCardProps) {
  return (
    <label className={`option${checked ? ' option--selected' : ''}`}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span className={`option__marker option__marker--${type}`} aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="option__text">
        {label}
        {hint && <span className="option__hint">{hint}</span>}
      </span>
    </label>
  );
}

/** Сообщение об ошибке под полем. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className="field__error" id={id} role="alert">
      <span aria-hidden="true">⚠</span>
      {children}
    </p>
  );
}
