/**
 * Модальное окно воронки — центральный компонент всей записи.
 *
 * Сценарий:
 *   шаги 1–3 (анкета) → шаг 4 (сводка + выбор действия)
 *     ├─ «Связаться в Telegram»   → отправка (intent: contact)
 *     └─ «Записаться на сессию»   → календарь → отправка (intent: booking)
 *   → прелоадер → экран успеха со ссылкой на бота (или экран ошибки).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiRequestError, fetchBookedSlots, submitForm } from '../../api/client';
import { psychologist } from '../../data/content';
import { useWizardState } from '../../hooks/useWizardState';
import type { ClientForm, Gender, Intent, SubmitFormResponse, WizardScreen } from '../../types';
import { formatDateLong, type BookedSlots } from '../../utils/slots';
import { validateStep, type FieldErrors } from '../../utils/validation';
import { BookingCalendar } from './BookingCalendar';
import { Loader } from './Loader';
import { ProgressBar } from './ProgressBar';
import { ErrorScreen, SuccessScreen } from './ResultScreens';
import { StepPersonal, StepRequest, StepSummary, StepTopics } from './steps';

/** Подписи шагов для индикатора прогресса. */
const STEP_LABELS = ['О вас', 'Запрос', 'Подробности', 'Проверка'];

const TOTAL_STEPS = STEP_LABELS.length;

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WizardModal({ isOpen, onClose }: WizardModalProps) {
  const { data, update, reset } = useWizardState();

  const [screen, setScreen] = useState<WizardScreen>('form');
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Направление анимации перехода: вперёд или назад. */
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [result, setResult] = useState<SubmitFormResponse | null>(null);
  const [intent, setIntent] = useState<Intent>('booking');
  const [errorMessage, setErrorMessage] = useState('');
  /**
   * Дата и время записи, зафиксированные на момент отправки.
   * Нужны отдельно, потому что после успешной отправки анкета очищается,
   * а на экране успеха слот всё ещё нужно показать.
   */
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string | undefined>(undefined);
  /** Занятое время, полученное с сервера, и признак его загрузки. */
  const [bookedSlots, setBookedSlots] = useState<BookedSlots>({});
  const [slotsLoading, setSlotsLoading] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  /* --------------------------------------------------------------- */
  /* Побочные эффекты окна                                            */
  /* --------------------------------------------------------------- */

  // Блокируем прокрутку страницы под модальным окном.
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, [isOpen]);

  // Закрытие по Escape — привычное поведение модальных окон.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // При смене шага прокручиваем содержимое наверх: иначе на мобильных
  // новый шаг открывается в середине.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, screen]);

  /* --------------------------------------------------------------- */
  /* Навигация по шагам                                               */
  /* --------------------------------------------------------------- */

  /** Подгружает занятое время с сервера — вызывается перед показом календаря. */
  const loadSlots = useCallback(async (): Promise<void> => {
    setSlotsLoading(true);
    try {
      setBookedSlots(await fetchBookedSlots());
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  /** Переход к следующему шагу с проверкой текущего. */
  function goNext(): void {
    const stepErrors = validateStep(step, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setDirection('forward');
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  /** Возврат на шаг назад (или из календаря к сводке). */
  function goBack(): void {
    setErrors({});
    setDirection('back');

    if (screen === 'calendar') {
      setScreen('form');
      return;
    }

    setStep((current) => Math.max(current - 1, 1));
  }

  /** Собирает данные анкеты в формат, который ждёт сервер. */
  const buildForm = useCallback((): ClientForm => {
    return {
      name: data.name.trim(),
      gender: data.gender as Gender,
      age: Number(data.age),
      topics: data.topics,
      ...(data.customTopic.trim() ? { customTopic: data.customTopic.trim() } : {}),
      ...(data.request.trim() ? { request: data.request.trim() } : {}),
      ...(data.phone.trim() ? { phone: data.phone.trim() } : {}),
      consent: data.consent,
    };
  }, [data]);

  /* --------------------------------------------------------------- */
  /* Отправка заявки                                                  */
  /* --------------------------------------------------------------- */

  const send = useCallback(
    async (selectedIntent: Intent): Promise<void> => {
      setIntent(selectedIntent);
      setScreen('sending');
      setErrorMessage('');
      setConfirmedSlotLabel(
        selectedIntent === 'booking' && data.bookingDate && data.bookingTime
          ? `${formatDateLong(data.bookingDate)}, ${data.bookingTime}`
          : undefined,
      );

      try {
        const response = await submitForm({
          intent: selectedIntent,
          form: buildForm(),
          ...(selectedIntent === 'booking'
            ? { slot: { date: data.bookingDate, time: data.bookingTime, format: data.format } }
            : {}),
        });

        setResult(response);
        setScreen('success');
        // Черновик больше не нужен: заявка ушла.
        reset();
      } catch (error) {
        const message =
          error instanceof ApiRequestError
            ? error.message
            : 'Неизвестная ошибка. Попробуйте ещё раз или напишите психологу напрямую.';

        setErrorMessage(message);

        // Слот заняли, пока клиент заполнял анкету: возвращаем к календарю
        // и подтягиваем актуальное расписание.
        if (error instanceof ApiRequestError && error.details?.slot) {
          setErrors({ slot: error.details.slot });
          setScreen('calendar');
          void loadSlots();
          return;
        }

        // Если сервер вернул ошибки по полям — возвращаем человека к анкете.
        if (error instanceof ApiRequestError && error.details) {
          setErrors(error.details);
          setScreen('form');
          setStep(1);
          return;
        }

        setScreen('error');
      }
    },
    [buildForm, data.bookingDate, data.bookingTime, data.format, loadSlots, reset],
  );

  /** «Записаться на сессию» на шаге 4: сначала проверяем согласие. */
  function handleBookingClick(): void {
    const stepErrors = validateStep(4, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setDirection('forward');
    setScreen('calendar');
    void loadSlots();
  }

  /** «Связаться с психологом» на шаге 4. */
  function handleContactClick(): void {
    const stepErrors = validateStep(4, data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    void send('contact');
  }

  /** Подтверждение выбранного слота в календаре. */
  function handleConfirmBooking(): void {
    if (!data.bookingDate || !data.bookingTime) {
      setErrors({ slot: 'Выберите дату и время встречи' });
      return;
    }

    setErrors({});
    void send('booking');
  }

  /** Полный сброс состояния окна — вызывается при закрытии. */
  function handleClose(): void {
    onClose();

    // Сбрасываем с задержкой, чтобы пользователь не увидел «прыжок» контента
    // во время анимации закрытия.
    window.setTimeout(() => {
      setScreen('form');
      setStep(1);
      setErrors({});
      setResult(null);
      setErrorMessage('');
      setConfirmedSlotLabel(undefined);
    }, 250);
  }

  if (!isOpen) return null;

  /* --------------------------------------------------------------- */
  /* Рендер                                                           */
  /* --------------------------------------------------------------- */

  /** Содержимое тела окна зависит от текущего экрана. */
  function renderBody() {
    if (screen === 'sending') {
      return (
        <Loader
          title="Отправляем заявку…"
          hint="Передаём анкету психологу и готовим ссылку на подтверждение в Telegram."
        />
      );
    }

    if (screen === 'success' && result) {
      return <SuccessScreen result={result} intent={intent} slotLabel={confirmedSlotLabel} onClose={handleClose} />;
    }

    if (screen === 'error') {
      return (
        <ErrorScreen
          message={errorMessage}
          psychologistLink={psychologist.telegram}
          onRetry={() => void send(intent)}
          onClose={handleClose}
        />
      );
    }

    if (screen === 'calendar') {
      return (
        <div className={direction === 'back' ? 'step step--back' : 'step'}>
          <BookingCalendar data={data} onChange={update} booked={bookedSlots} isLoading={slotsLoading} />
          {errors.slot && (
            <div className="alert" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{errors.slot}</span>
            </div>
          )}
        </div>
      );
    }

    // Экран анкеты: шаги 1–4.
    const stepProps = { data, errors, onChange: update };

    return (
      <div className={direction === 'back' ? 'step step--back' : 'step'} key={step}>
        {step === 1 && <StepPersonal {...stepProps} />}
        {step === 2 && <StepTopics {...stepProps} />}
        {step === 3 && <StepRequest {...stepProps} />}
        {step === 4 && (
          <StepSummary
            {...stepProps}
            onEdit={() => {
              setDirection('back');
              setStep(1);
            }}
          />
        )}
      </div>
    );
  }

  /** Нижняя панель с кнопками навигации (на экранах результата не нужна). */
  function renderFooter() {
    if (screen === 'sending' || screen === 'success' || screen === 'error') return null;

    if (screen === 'calendar') {
      return (
        <div className="wizard__footer">
          <button type="button" className="button button--ghost" onClick={goBack}>
            ← Назад
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!data.bookingDate || !data.bookingTime}
            onClick={handleConfirmBooking}
          >
            Подтвердить запись
          </button>
        </div>
      );
    }

    // Финальный шаг: два настоящих действия. Основное — выбрать время,
    // второстепенное — написать в Telegram без записи.
    if (step === TOTAL_STEPS) {
      return (
        <div className="wizard__footer wizard__footer--final">
          <button type="button" className="button button--ghost" onClick={goBack} aria-label="Назад">
            ←
          </button>
          <button type="button" className="button button--secondary" onClick={handleContactClick}>
            Написать в Telegram
          </button>
          <button type="button" className="button button--primary" onClick={handleBookingClick}>
            Выбрать дату и время
          </button>
        </div>
      );
    }

    return (
      <div className="wizard__footer">
        {step > 1 && (
          <button type="button" className="button button--ghost" onClick={goBack}>
            ← Назад
          </button>
        )}
        <button type="button" className="button button--primary" onClick={goNext}>
          Далее
        </button>
      </div>
    );
  }

  const showProgress = screen === 'form' || screen === 'calendar';

  return (
    <div
      className="wizard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      // Клик мимо окна закрывает воронку; клик внутри — нет.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="wizard">
        <div className="wizard__header">
          <div>
            <h2 className="wizard__title" id="wizard-title">
              Запись на консультацию
            </h2>
            <p className="wizard__subtitle">
              {screen === 'form'
                ? `Шаг ${step} из ${TOTAL_STEPS} · ${STEP_LABELS[step - 1]}`
                : screen === 'calendar'
                  ? 'Последний шаг · дата и время'
                  : 'Займёт около двух минут'}
            </p>
          </div>
          <button type="button" className="wizard__close" onClick={handleClose} aria-label="Закрыть окно записи">
            ✕
          </button>
        </div>

        {showProgress && <ProgressBar current={screen === 'calendar' ? TOTAL_STEPS : step} labels={STEP_LABELS} />}

        <div className="wizard__body" ref={bodyRef}>
          {renderBody()}
        </div>

        {renderFooter()}
      </div>
    </div>
  );
}
