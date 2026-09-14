/**
 * Шаги анкеты (1–3) и финальная сводка (шаг 4).
 * Компоненты «глупые»: получают данные и колбэки, всю логику держит WizardModal.
 */

import { TOPIC_OPTIONS, GENDER_LABELS, topicLabel } from '@shared/topics';

import type { WizardData } from '../../types';
import { formatAge } from '../../utils/format';
import type { FieldErrors } from '../../utils/validation';
import { FieldError, OptionCard, TextAreaField, TextField } from './fields';

/** Общие пропсы всех шагов. */
interface StepProps {
  data: WizardData;
  errors: FieldErrors;
  /** Частичное обновление данных воронки. */
  onChange: (patch: Partial<WizardData>) => void;
}

/* ------------------------------------------------------------------ */
/* Шаг 1. Личные данные                                               */
/* ------------------------------------------------------------------ */

export function StepPersonal({ data, errors, onChange }: StepProps) {
  return (
    <div>
      <h3 className="step__title">Давайте познакомимся</h3>
      <p className="step__hint">
        Эти данные видит только психолог. Они нужны, чтобы обратиться к вам по имени и подготовиться к встрече.
      </p>

      <TextField
        id="wizard-name"
        label="Как к вам обращаться?"
        placeholder="Например, Мария"
        value={data.name}
        error={errors.name}
        maxLength={60}
        autoFocus
        onChange={(value) => onChange({ name: value })}
      />

      <div className="field">
        <span className="field__label" id="wizard-gender-label">
          Пол
        </span>
        <div className="options options--inline" role="radiogroup" aria-labelledby="wizard-gender-label">
          {Object.entries(GENDER_LABELS).map(([value, label]) => (
            <OptionCard
              key={value}
              type="radio"
              name="gender"
              value={value}
              label={label}
              checked={data.gender === value}
              onChange={(selected) => onChange({ gender: selected as WizardData['gender'] })}
            />
          ))}
        </div>
        {errors.gender && <FieldError>{errors.gender}</FieldError>}
      </div>

      {/* На широких экранах возраст и телефон стоят в один ряд — так шаг помещается без прокрутки. */}
      <div className="field-row">
        <TextField
          id="wizard-age"
          label="Возраст"
          placeholder="Например, 29"
          type="number"
          inputMode="numeric"
          value={data.age}
          error={errors.age}
          onChange={(value) => onChange({ age: value.replace(/\D/g, '').slice(0, 3) })}
        />

        <TextField
          id="wizard-phone"
          label="Телефон"
          placeholder="+7 (900) 000-00-00"
          type="tel"
          inputMode="tel"
          optional
          value={data.phone}
          error={errors.phone}
          maxLength={30}
          onChange={(value) => onChange({ phone: value })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Шаг 2. Направления работы                                          */
/* ------------------------------------------------------------------ */

export function StepTopics({ data, errors, onChange }: StepProps) {
  /** Добавляет или убирает направление из списка выбранных. */
  function toggleTopic(key: string): void {
    const next = data.topics.includes(key)
      ? data.topics.filter((item) => item !== key)
      : [...data.topics, key];
    onChange({ topics: next });
  }

  return (
    <div>
      <h3 className="step__title">С чем хотите поработать?</h3>
      <p className="step__hint">Можно отметить несколько пунктов. Если ничего не подходит — впишите свой вариант.</p>

      <div className="options options--columns" role="group" aria-label="Направления работы">
        {TOPIC_OPTIONS.map((option) => (
          <OptionCard
            key={option.key}
            type="checkbox"
            name="topics"
            value={option.key}
            label={option.label}
            hint={option.hint}
            checked={data.topics.includes(option.key)}
            onChange={toggleTopic}
          />
        ))}
      </div>
      {errors.topics && <FieldError>{errors.topics}</FieldError>}

      <div style={{ marginTop: 12 }}>
        <TextField
          id="wizard-custom-topic"
          label="Свой вариант"
          labelHidden
          placeholder="Свой вариант — опишите тему своими словами"
          optional
          value={data.customTopic}
          error={errors.customTopic}
          maxLength={120}
          onChange={(value) => onChange({ customTopic: value })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Шаг 3. Свободное описание запроса                                  */
/* ------------------------------------------------------------------ */

export function StepRequest({ data, errors, onChange }: StepProps) {
  return (
    <div>
      <h3 className="step__title">Расскажите чуть подробнее</h3>
      <p className="step__hint">
        Пара предложений о том, что происходит и чего вы ждёте от работы. Этот шаг можно пропустить — обсудим всё на
        встрече.
      </p>

      <TextAreaField
        id="wizard-request"
        label="Ваш запрос"
        placeholder="Например: последние месяцы тяжело засыпаю, постоянно прокручиваю рабочие ситуации и не могу расслабиться…"
        optional
        value={data.request}
        error={errors.request}
        maxLength={1500}
        onChange={(value) => onChange({ request: value })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Шаг 4. Сводка и выбор действия                                     */
/* ------------------------------------------------------------------ */

interface StepSummaryProps extends StepProps {
  /** Вернуться к первому шагу для правки данных. */
  onEdit: () => void;
}

/**
 * Финальный шаг: сводка и согласие. Сами действия («Выбрать время» и
 * «Написать в Telegram») живут в футере окна — так они всегда на виду
 * и выглядят как кнопки, а не как варианты ответа.
 */
export function StepSummary({ data, errors, onChange, onEdit }: StepSummaryProps) {
  // Собираем перечень направлений: выбранные из списка + свой вариант.
  const topics = [...data.topics.map(topicLabel), ...(data.customTopic ? [data.customTopic] : [])];

  return (
    <div>
      <h3 className="step__title">Проверьте данные</h3>
      <p className="step__hint">
        Так анкета придёт психологу. Дальше — выбрать время встречи или просто написать в Telegram.
      </p>

      <div className="summary">
        <div className="summary__row">
          <span className="summary__label">Имя</span>
          <span className="summary__value">{data.name}</span>
        </div>
        <div className="summary__row">
          <span className="summary__label">Пол и возраст</span>
          <span className="summary__value">
            {GENDER_LABELS[data.gender] ?? '—'}, {formatAge(data.age)}
          </span>
        </div>
        {data.phone && (
          <div className="summary__row">
            <span className="summary__label">Телефон</span>
            <span className="summary__value">{data.phone}</span>
          </div>
        )}
        <div className="summary__row">
          <span className="summary__label">Направления</span>
          <span className="summary__value">{topics.join(', ')}</span>
        </div>
        {data.request && (
          <div className="summary__row">
            <span className="summary__label">Запрос</span>
            <span className="summary__value summary__value--quote">«{data.request}»</span>
          </div>
        )}
        <button type="button" className="summary__edit" onClick={onEdit}>
          Изменить ответы
        </button>
      </div>

      <label className={`consent${errors.consent ? ' consent--error' : ''}`}>
        <input
          type="checkbox"
          checked={data.consent}
          aria-invalid={Boolean(errors.consent)}
          onChange={(event) => onChange({ consent: event.target.checked })}
          style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, accentColor: 'var(--color-accent)' }}
        />
        <span>
          Согласен(на) на обработку персональных данных —{' '}
          <a href="#privacy" target="_blank" rel="noreferrer">
            политика конфиденциальности
          </a>
          . Анкету видит только психолог.
        </span>
      </label>
      {errors.consent && <FieldError>{errors.consent}</FieldError>}
    </div>
  );
}
