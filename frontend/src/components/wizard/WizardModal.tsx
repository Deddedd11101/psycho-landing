/**
 * Окно записи — два шага.
 *
 *   шаг 1: календарь (дата, время, формат)
 *          └─ «написать без записи» → шаг 2 в режиме contact
 *   шаг 2: короткая анкета (имя, телефон, что беспокоит, согласие)
 *   → отправка → экран успеха со ссылкой на бота (или экран ошибки)
 *
 * Сначала время, потом анкета: человеку важнее сразу увидеть, есть ли
 * подходящий слот, чем рассказывать о себе.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiRequestError, fetchSlots, submitForm } from '../../api/client';
import { psychologist } from '../../data/content';
import { useWizardState } from '../../hooks/useWizardState';
import type { ClientForm, Intent, SubmitFormResponse, WizardScreen } from '../../types';
import { formatDateLong, type BookedSlots, type ScheduleSettings } from '../../utils/slots';
import { validateDetails, validateSlot, type FieldErrors } from '../../utils/validation';
import { BookingCalendar } from './BookingCalendar';
import { Loader } from './Loader';
import { ProgressBar } from './ProgressBar';
import { ErrorScreen, SuccessScreen } from './ResultScreens';
import { StepDetails } from './steps';

/** Подписи шагов для индикатора прогресса. */
const STEP_LABELS = ['Время', 'О вас'];

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WizardModal({ isOpen, onClose }: WizardModalProps) {
  const { data, update, reset } = useWizardState();

  const [screen, setScreen] = useState<WizardScreen>('calendar');
  /** Что делает клиент: записывается на время или просто пишет. */
  const [intent, setIntent] = useState<Intent>('booking');
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Направление анимации перехода: вперёд или назад. */
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [result, setResult] = useState<SubmitFormResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  /**
   * Дата и время, зафиксированные на момент отправки: анкета после успеха
   * очищается, а на экране успеха слот ещё нужно показать.
   */
  const [confirmedSlotLabel, setConfirmedSlotLabel] = useState<string | undefined>(undefined);
  /** Имя из анкеты на момент отправки — для готового сообщения в WhatsApp. */
  const [confirmedName, setConfirmedName] = useState('');
  /** Расписание и занятое время с сервера; признак загрузки. */
  const [bookedSlots, setBookedSlots] = useState<BookedSlots>({});
  const [schedule, setSchedule] = useState<ScheduleSettings | undefined>(undefined);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  /* --------------------------------------------------------------- */
  /* Побочные эффекты окна                                            */
  /* --------------------------------------------------------------- */

  /** Подгружает расписание и занятое время с сервера. */
  const loadSlots = useCallback(async (): Promise<void> => {
    setSlotsLoading(true);
    try {
      const fresh = await fetchSlots();
      if (fresh) {
        setBookedSlots(fresh.booked);
        setSchedule(fresh.schedule);
      }
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // Открытие окна: блокируем прокрутку страницы и подгружаем расписание.
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add('is-locked');
    void loadSlots();
    return () => document.body.classList.remove('is-locked');
  }, [isOpen, loadSlots]);

  // Закрытие по Escape — привычное поведение модальных окон.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // При смене экрана прокручиваем содержимое наверх.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [screen]);

  /* --------------------------------------------------------------- */
  /* Навигация                                                        */
  /* --------------------------------------------------------------- */

  /** Календарь → анкета (запись на выбранное время). */
  function goToDetails(): void {
    const slotErrors = validateSlot(data);
    setErrors(slotErrors);
    if (Object.keys(slotErrors).length > 0) return;

    setIntent('booking');
    setDirection('forward');
    setScreen('form');
  }

  /** Календарь → анкета без времени («написать без записи»). */
  function goToContact(): void {
    setErrors({});
    setIntent('contact');
    setDirection('forward');
    setScreen('form');
  }

  /** Анкета → календарь. */
  function goBack(): void {
    setErrors({});
    setDirection('back');
    setScreen('calendar');
  }

  /** Собирает данные анкеты в формат, который ждёт сервер. */
  const buildForm = useCallback((): ClientForm => {
    return {
      name: data.name.trim(),
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

  const send = useCallback(async (): Promise<void> => {
    setScreen('sending');
    setErrorMessage('');
    setConfirmedName(data.name.trim());
    setConfirmedSlotLabel(
      intent === 'booking' && data.bookingDate && data.bookingTime
        ? `${formatDateLong(data.bookingDate)}, ${data.bookingTime}`
        : undefined,
    );

    try {
      const response = await submitForm({
        intent,
        form: buildForm(),
        ...(intent === 'booking'
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
        setDirection('back');
        setScreen('calendar');
        void loadSlots();
        return;
      }

      // Сервер вернул ошибки по полям — показываем их в анкете.
      if (error instanceof ApiRequestError && error.details) {
        setErrors(error.details);
        setScreen('form');
        return;
      }

      setScreen('error');
    }
  }, [buildForm, data.name, data.bookingDate, data.bookingTime, data.format, intent, loadSlots, reset]);

  /** Кнопка «Отправить» на анкете. */
  function handleSubmit(): void {
    const detailErrors = validateDetails(data);
    setErrors(detailErrors);
    if (Object.keys(detailErrors).length > 0) return;

    void send();
  }

  /** Полный сброс состояния окна — вызывается при закрытии. */
  function handleClose(): void {
    onClose();

    // Сбрасываем с задержкой, чтобы пользователь не увидел «прыжок» контента
    // во время анимации закрытия.
    window.setTimeout(() => {
      setScreen('calendar');
      setIntent('booking');
      setErrors({});
      setResult(null);
      setErrorMessage('');
      setConfirmedSlotLabel(undefined);
      setConfirmedName('');
    }, 250);
  }

  if (!isOpen) return null;

  /* --------------------------------------------------------------- */
  /* Рендер                                                           */
  /* --------------------------------------------------------------- */

  const stepClass = direction === 'back' ? 'step step--back' : 'step';

  /** Содержимое тела окна зависит от текущего экрана. */
  function renderBody() {
    if (screen === 'sending') {
      return (
        <Loader title="Отправляем заявку…" hint="Передаём данные психологу и готовим ссылку на подтверждение в Telegram." />
      );
    }

    if (screen === 'success' && result) {
      return (
        <SuccessScreen
          result={result}
          intent={intent}
          slotLabel={confirmedSlotLabel}
          clientName={confirmedName}
          onClose={handleClose}
        />
      );
    }

    if (screen === 'error') {
      return (
        <ErrorScreen
          message={errorMessage}
          psychologistLink={psychologist.telegram}
          onRetry={() => void send()}
          onClose={handleClose}
        />
      );
    }

    if (screen === 'calendar') {
      return (
        <div className={stepClass} key="calendar">
          <BookingCalendar
            data={data}
            onChange={update}
            booked={bookedSlots}
            schedule={schedule}
            isLoading={slotsLoading}
            onContactInstead={goToContact}
          />
          {errors.slot && (
            <div className="alert" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{errors.slot}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={stepClass} key="form">
        <StepDetails data={data} errors={errors} onChange={update} isBooking={intent === 'booking'} />
      </div>
    );
  }

  /** Нижняя панель с кнопками навигации (на экранах результата не нужна). */
  function renderFooter() {
    if (screen === 'sending' || screen === 'success' || screen === 'error') return null;

    if (screen === 'calendar') {
      return (
        <div className="wizard__footer">
          <button
            type="button"
            className="button button--primary"
            disabled={!data.bookingDate || !data.bookingTime}
            onClick={goToDetails}
          >
            Далее
          </button>
        </div>
      );
    }

    return (
      <div className="wizard__footer">
        <button type="button" className="button button--ghost" onClick={goBack}>
          ← Назад
        </button>
        <button type="button" className="button button--primary" onClick={handleSubmit}>
          {intent === 'booking' ? 'Записаться' : 'Отправить'}
        </button>
      </div>
    );
  }

  const currentStep = screen === 'calendar' ? 1 : 2;
  const showProgress = screen === 'calendar' || screen === 'form';
  const subtitle =
    screen === 'calendar'
      ? 'Шаг 1 из 2 · выберите время'
      : screen === 'form'
        ? intent === 'booking'
          ? 'Шаг 2 из 2 · пара слов о себе'
          : 'Сообщение без записи'
        : 'Займёт около минуты';

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
              Запись на знакомство
            </h2>
            <p className="wizard__subtitle">{subtitle}</p>
          </div>
          <button type="button" className="wizard__close" onClick={handleClose} aria-label="Закрыть окно записи">
            ✕
          </button>
        </div>

        {showProgress && intent === 'booking' && <ProgressBar current={currentStep} labels={STEP_LABELS} />}

        <div className="wizard__body" ref={bodyRef}>
          {renderBody()}
        </div>

        {renderFooter()}
      </div>
    </div>
  );
}
