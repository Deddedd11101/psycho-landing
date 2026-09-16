/**
 * Сборка текстов Telegram-сообщений.
 * Вся разметка — HTML (parse_mode: 'HTML'), пользовательский ввод обязательно экранируется.
 */

import { buildPsychologistLink, config } from './config.js';
import { escapeHtml } from './telegram.js';
import { FORMAT_LABELS, GENDER_LABELS, topicLabel } from './topics.js';
import type { SessionRecord } from './types.js';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

/** Превращает '2026-09-14' в '14 сентября, понедельник'. */
export function formatDateRu(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  // Полдень по UTC — чтобы часовой пояс не сдвинул дату на соседний день.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return `${day} ${MONTHS[month - 1]}, ${WEEKDAYS[date.getUTCDay()]}`;
}

/** Склонение слова «год» для возраста: 21 год, 22 года, 25 лет. */
function ageWord(age: number): string {
  const lastTwo = age % 100;
  const last = age % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (last === 1) return 'год';
  if (last >= 2 && last <= 4) return 'года';
  return 'лет';
}

/** Собирает список направлений клиента (включая свой вариант). */
function topicsList(session: SessionRecord): string {
  const items = session.form.topics.map((key) => `• ${escapeHtml(topicLabel(key))}`);
  if (session.form.customTopic) {
    items.push(`• ${escapeHtml(session.form.customTopic)} <i>(свой вариант)</i>`);
  }
  return items.length > 0 ? items.join('\n') : '• не указано';
}

/**
 * Строки блока «дата и время». Пустой массив, если слот не выбран, —
 * так его удобно вставлять через spread, не ломая пустые строки-разделители.
 */
function slotLines(session: SessionRecord): string[] {
  if (!session.slot) return [];
  const { date, time, format } = session.slot;
  return [
    '',
    `🗓 <b>Дата:</b> ${escapeHtml(formatDateRu(date))}`,
    `⏰ <b>Время:</b> ${escapeHtml(time)} (мск)`,
    `📍 <b>Формат:</b> ${escapeHtml(FORMAT_LABELS[format] ?? format)}`,
  ];
}

/** Общая «карточка клиента» — используется во всех сообщениях психологу. */
function clientCard(session: SessionRecord): string {
  const { form } = session;
  const lines = [`👤 <b>Имя:</b> ${escapeHtml(form.name)}`];

  if (form.gender) {
    lines.push(`🚻 <b>Пол:</b> ${escapeHtml(GENDER_LABELS[form.gender] ?? form.gender)}`);
  }
  if (form.age !== undefined) {
    lines.push(`🎂 <b>Возраст:</b> ${form.age} ${ageWord(form.age)}`);
  }

  if (form.phone) {
    lines.push(`📞 <b>Телефон:</b> ${escapeHtml(form.phone)}`);
  }

  lines.push('', '<b>Направления:</b>', topicsList(session));

  if (form.request) {
    lines.push('', '<b>Запрос клиента:</b>', `<i>${escapeHtml(form.request)}</i>`);
  }

  return lines.join('\n');
}

/**
 * Первичное уведомление психологу — отправляется сразу после отправки формы на сайте,
 * ещё до того, как клиент перешёл в бота. Так заявка не потеряется, даже если клиент
 * закроет вкладку и не нажмёт «Start».
 */
export function newLeadForPsychologist(session: SessionRecord): string {
  const header =
    session.intent === 'booking'
      ? '🆕 <b>Новая запись на знакомство</b>'
      : '🆕 <b>Новое обращение с сайта</b>';

  return [
    header,
    '<i>Клиент заполнил анкету на сайте. Ожидаем подтверждение в боте.</i>',
    '',
    clientCard(session),
    ...slotLines(session),
    '',
    `<code>ID заявки: ${session.id}</code>`,
  ].join('\n');
}

/**
 * Сообщение психологу после того, как клиент нажал «Start» в боте.
 * Здесь уже есть прямая ссылка на клиента — можно написать первым.
 */
export function confirmedLeadForPsychologist(session: SessionRecord): string {
  const client = session.client;
  const header =
    session.intent === 'booking'
      ? '✅ <b>Клиент подтвердил знакомство</b>'
      : '💬 <b>Клиент готов к диалогу</b>';

  const contactLines: string[] = [];
  if (client) {
    contactLines.push('', '<b>Связь с клиентом:</b>');
    if (client.username) {
      contactLines.push(`• @${escapeHtml(client.username)} — https://t.me/${escapeHtml(client.username)}`);
    }
    contactLines.push(`• <a href="tg://user?id=${client.chatId}">Открыть чат в Telegram</a>`);
    contactLines.push(`• chat_id: <code>${client.chatId}</code>`);
  }

  return [
    header,
    '',
    clientCard(session),
    ...slotLines(session),
    ...contactLines,
    '',
    `<code>ID заявки: ${session.id}</code>`,
  ].join('\n');
}

/**
 * Короткая строка-уведомление психологу после подтверждения.
 * Отправляется ответом на карточку заявки: сама карточка редактируется без уведомления,
 * а эта строка гарантирует, что подтверждение не пройдёт незамеченным.
 */
export function confirmationPingForPsychologist(session: SessionRecord): string {
  const name = escapeHtml(session.form.name);
  if (session.intent === 'booking' && session.slot) {
    return `✅ ${name} подтвердил(а) знакомство: ${escapeHtml(formatDateRu(session.slot.date))}, ${escapeHtml(session.slot.time)}`;
  }
  return `💬 ${name} открыл(а) бота — можно писать`;
}

/** Карточка у специалиста после отмены записи. */
export function cancelledLeadForPsychologist(session: SessionRecord): string {
  return [
    '❌ <b>Запись отменена</b>',
    '',
    clientCard(session),
    ...slotLines(session),
    '',
    `<code>ID заявки: ${session.id}</code>`,
  ].join('\n');
}

/** Сообщение клиенту об отмене записи специалистом. */
export function cancellationForClient(session: SessionRecord): string {
  const name = escapeHtml(session.form.name);
  const when = session.slot
    ? ` на ${escapeHtml(formatDateRu(session.slot.date))}, ${escapeHtml(session.slot.time)}`
    : '';
  return [
    `${name}, здравствуйте.`,
    '',
    `К сожалению, встречу${when} приходится отменить. Приношу извинения за неудобства.`,
    '',
    `Давайте подберём другое время — напишите мне: ${buildPsychologistLink()}`,
    `Или выберите новый слот на сайте: ${escapeHtml(config.publicUrl)}`,
  ].join('\n');
}

/** Подтверждение клиенту: что записали, куда приходить и как связаться. */
export function confirmationForClient(session: SessionRecord): string {
  const name = escapeHtml(session.form.name);
  const psychologistLink = buildPsychologistLink();

  // Ветка «просто связаться»: записи нет, поэтому не обещаем дату.
  if (session.intent === 'contact' || !session.slot) {
    return [
      `Здравствуйте, ${name}! 👋`,
      '',
      `Ваша анкета получена — ${escapeHtml(config.psychologistName)} уже видит ваш запрос и ответит в ближайшее время (обычно в течение дня).`,
      '',
      `Если хотите написать первым — вот прямой контакт: ${psychologistLink}`,
      '',
      '<i>Всё, что вы написали, конфиденциально.</i>',
    ].join('\n');
  }

  const { date, time, format } = session.slot;
  const place =
    format === 'online'
      ? `🔗 <b>Ссылка на встречу:</b> ${escapeHtml(config.meetingLink)}`
      : `📍 <b>Адрес:</b> ${escapeHtml(config.officeAddress)}`;

  return [
    `Здравствуйте, ${name}! 👋`,
    '',
    '✅ <b>Вы записаны на встречу-знакомство</b>',
    '',
    `🗓 <b>Дата:</b> ${escapeHtml(formatDateRu(date))}`,
    `⏰ <b>Время:</b> ${escapeHtml(time)} (мск)`,
    `📍 <b>Формат:</b> ${escapeHtml(FORMAT_LABELS[format] ?? format)}`,
    place,
    '',
    `💬 <b>Контакт специалиста:</b> ${psychologistLink}`,
    '',
    'Знакомство длится 20 минут и проходит онлайн: расскажете, что происходит, я — как работаю, и договоримся о дальнейших встречах. Если планы изменятся, пожалуйста, предупредите заранее.',
    '',
    '<i>До встречи!</i>',
  ].join('\n');
}

/** Приветствие при обычном /start без параметра. */
export function welcomeMessage(): string {
  return [
    '👋 <b>Здравствуйте!</b>',
    '',
    `Это бот записи на консультацию (${escapeHtml(config.psychologistName)}). Через него приходят подтверждения записи.`,
    '',
    `Чтобы записаться, заполните короткую анкету на сайте: ${escapeHtml(config.publicUrl)}`,
    '',
    `Если хотите просто задать вопрос — напишите напрямую: ${buildPsychologistLink()}`,
  ].join('\n');
}

/** Ответ, если срок жизни заявки истёк или ссылка неверна. */
export function expiredSessionMessage(): string {
  return [
    '⏳ <b>Заявка не найдена</b>',
    '',
    'Похоже, ссылка устарела — заявки хранятся ограниченное время.',
    '',
    `Пожалуйста, заполните анкету заново: ${escapeHtml(config.publicUrl)}`,
    '',
    `Или напишите психологу напрямую: ${buildPsychologistLink()}`,
  ].join('\n');
}

/** Ответ на любое другое сообщение боту. */
export function fallbackMessage(): string {
  return [
    'Я служебный бот записи и не читаю переписку. 🙃',
    '',
    `Все вопросы лучше задать психологу напрямую: ${buildPsychologistLink()}`,
    '',
    `А записаться можно здесь: ${escapeHtml(config.publicUrl)}`,
  ].join('\n');
}
