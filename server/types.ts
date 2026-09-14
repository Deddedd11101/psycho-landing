/**
 * Общие типы данных, которыми обмениваются фронтенд, API и Telegram-бот.
 * Файл намеренно не зависит ни от каких библиотек — его можно импортировать откуда угодно.
 */

/** Пол клиента (используется психологом для подготовки к сессии). */
export type Gender = 'female' | 'male' | 'other';

/** Формат проведения сессии. */
export type SessionFormat = 'online' | 'offline';

/**
 * Что клиент хочет сделать после заполнения анкеты:
 * - `contact` — просто связаться с психологом в Telegram;
 * - `booking` — записаться на конкретные дату и время.
 */
export type Intent = 'contact' | 'booking';

/** Выбранные клиентом дата и время приёма. */
export interface BookingSlot {
  /** Дата в формате YYYY-MM-DD. */
  date: string;
  /** Время в формате HH:mm. */
  time: string;
  /** Онлайн или очно. */
  format: SessionFormat;
}

/** Данные, которые клиент заполняет в воронке (анкета). */
export interface ClientForm {
  name: string;
  gender: Gender;
  age: number;
  /** Ключи выбранных направлений работы (см. TOPIC_OPTIONS на фронтенде). */
  topics: string[];
  /** Свой вариант направления, если клиент его вписал. */
  customTopic?: string;
  /** Свободное описание запроса (необязательное поле). */
  request?: string;
  /** Телефон — запасной канал связи, если клиент не дойдёт до Telegram. */
  phone?: string;
  /** Согласие на обработку персональных данных. Без него заявка не принимается. */
  consent: boolean;
}

/** Данные Telegram-пользователя, полученные ботом при команде /start. */
export interface TelegramClient {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Статус заявки:
 * - `pending` — анкета отправлена, клиент ещё не подтвердил в боте;
 * - `confirmed` — клиент нажал «Start» в боте;
 * - `cancelled` — отменена специалистом (слот освобождён).
 */
export type SessionStatus = 'pending' | 'confirmed' | 'cancelled';

/** Запись о сессии заполнения формы, хранящаяся на сервере до подтверждения в боте. */
export interface SessionRecord {
  /** Короткий идентификатор, который передаётся в deep-link боту. */
  id: string;
  /** Момент создания (Unix ms). */
  createdAt: number;
  intent: Intent;
  form: ClientForm;
  slot?: BookingSlot;
  /** Заполняется, когда клиент перешёл в бота и нажал «Start». */
  client?: TelegramClient;
  /** Психолог уже получил первичное уведомление о заявке. */
  psychologistNotified: boolean;
  /**
   * message_id карточки заявки в чате психолога. При подтверждении клиентом
   * карточка редактируется на месте, а не дублируется новым сообщением.
   */
  psychologistMessageId?: number;
  /** Момент, когда клиент подтвердил заявку в боте (Unix ms). */
  confirmedAt?: number;
  /** Текущий статус заявки. Старые записи без поля считаются pending/confirmed по confirmedAt. */
  status?: SessionStatus;
  /** Момент отмены специалистом (Unix ms). */
  cancelledAt?: number;
}

/**
 * Настройки расписания приёма. Хранятся на сервере, правятся специалистом
 * через Mini App; сайт получает их вместе с занятыми слотами (GET /api/slots).
 */
export interface ScheduleSettings {
  /** Рабочие часы по дням недели: '0' — воскресенье … '6' — суббота. Нет ключа — выходной. */
  days: Record<string, string[]>;
  /** На сколько дней вперёд открыта запись. */
  horizonDays: number;
  /** За сколько часов до встречи запись закрывается. */
  minHoursBefore: number;
}

/** Ответ GET /api/slots. */
export interface SlotsResponse {
  /** Занятое время: дата -> список времени. */
  booked: Record<string, string[]>;
  schedule: ScheduleSettings;
}

/** Тело запроса POST /api/submit-form. */
export interface SubmitFormRequest {
  intent: Intent;
  form: ClientForm;
  slot?: BookingSlot;
}

/** Ответ POST /api/submit-form. */
export interface SubmitFormResponse {
  sessionId: string;
  /** Готовая ссылка вида https://t.me/<bot>?start=<sessionId> */
  telegramLink: string;
  /** Прямая ссылка на психолога — запасной вариант, если бот недоступен. */
  psychologistLink: string;
}

/** Стандартный формат ошибки API. */
export interface ApiError {
  error: string;
  /** Детали валидации по полям — используются фронтендом. */
  details?: Record<string, string>;
}
