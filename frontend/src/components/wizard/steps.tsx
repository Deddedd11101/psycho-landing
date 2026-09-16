/**
 * Шаг 2 воронки — короткая анкета одним экраном: имя, телефон,
 * с чем хотите поработать (необязательно), согласие.
 * Пол и возраст на сайте не спрашиваем — это обсуждается на встрече.
 */

import { TOPIC_OPTIONS } from '@shared/topics';

import type { WizardData } from '../../types';
import { PHONE_PREFIX, formatPhone } from '../../utils/phone';
import { formatDateLong } from '../../utils/slots';
import type { FieldErrors } from '../../utils/validation';
import { FieldError, TextAreaField, TextField } from './fields';

interface StepDetailsProps {
  data: WizardData;
  errors: FieldErrors;
  /** Частичное обновление данных воронки. */
  onChange: (patch: Partial<WizardData>) => void;
  /** true — это запись на время; false — просто «написать без записи». */
  isBooking: boolean;
}

export function StepDetails({ data, errors, onChange, isBooking }: StepDetailsProps) {
  /** Добавляет или убирает направление из списка выбранных. */
  function toggleTopic(key: string): void {
    const next = data.topics.includes(key) ? data.topics.filter((item) => item !== key) : [...data.topics, key];
    onChange({ topics: next });
  }

  return (
    <div>
      <h3 className="step__title">{isBooking ? 'Пара слов о себе' : 'Как с вами связаться'}</h3>
      <p className="step__hint">
        {isBooking && data.bookingDate && data.bookingTime ? (
          <>
            Знакомство онлайн: <strong>{formatDateLong(data.bookingDate)}, {data.bookingTime}</strong>. Осталось
            представиться.
          </>
        ) : (
          'Оставьте имя и, если хотите, пару слов о том, что беспокоит. Ответ придёт в Telegram.'
        )}
      </p>

      <div className="field-row">
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
        <TextField
          id="wizard-phone"
          label="Телефон"
          placeholder="+7 (9__) ___-__-__"
          type="tel"
          inputMode="tel"
          optional
          value={data.phone}
          error={errors.phone}
          maxLength={18}
          // Маска: «+7» подставляется сам, человек набирает с 9.
          onChange={(value) => onChange({ phone: formatPhone(value) })}
          onFocus={() => {
            if (!data.phone) onChange({ phone: PHONE_PREFIX });
          }}
          onBlur={() => {
            // Ничего не набрали — убираем подставленный префикс, поле снова пустое.
            if (data.phone === PHONE_PREFIX || data.phone === '+7') onChange({ phone: '' });
          }}
        />
      </div>

      <div className="field">
        <span className="field__label" id="wizard-topics-label">
          С чем хотите поработать?
          <span className="field__optional">необязательно</span>
        </span>
        {/* Чипы вместо чекбоксов: компактно, можно выбрать несколько или ничего. */}
        <div className="chips" role="group" aria-labelledby="wizard-topics-label">
          {TOPIC_OPTIONS.map((option) => {
            const selected = data.topics.includes(option.key);
            return (
              <button
                type="button"
                key={option.key}
                className={`chip${selected ? ' chip--selected' : ''}`}
                aria-pressed={selected}
                onClick={() => toggleTopic(option.key)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <TextAreaField
        id="wizard-request"
        label="Что беспокоит"
        placeholder="Пара предложений — что происходит и чего вы ждёте от работы. Можно пропустить."
        optional
        value={data.request}
        error={errors.request}
        maxLength={1500}
        onChange={(value) => onChange({ request: value })}
      />

      <label className={`consent${errors.consent ? ' consent--error' : ''}`}>
        <input
          type="checkbox"
          checked={data.consent}
          aria-invalid={Boolean(errors.consent)}
          onChange={(event) => onChange({ consent: event.target.checked })}
          style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, accentColor: 'var(--color-accent)' }}
        />
        <span>
          Согласен(на) на обработку персональных данных (
          <a href="#privacy" target="_blank" rel="noreferrer">
            политика
          </a>
          )
        </span>
      </label>
      {errors.consent && <FieldError>{errors.consent}</FieldError>}
    </div>
  );
}
