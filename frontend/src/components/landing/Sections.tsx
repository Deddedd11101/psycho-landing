/**
 * Секции лендинга: первый экран, «О себе», «Услуги и цены», «Как проходит работа»,
 * вопросы, призыв к действию, политика и подвал.
 *
 * Весь текст берётся из data/content.ts и проходит через типограф (typo),
 * чтобы предлоги и «₽» не висели на краю строки.
 */

import { useState, type CSSProperties } from 'react';

import { aboutFacts, aboutParagraphs, faq, processLines, psychologist, services, whatsappLink } from '../../data/content';
import { typo } from '../../utils/typo';

interface StartProps {
  /** Открыть окно записи. */
  onStart: () => void;
}

/* ------------------------------------------------------------------ */
/* Первый экран                                                        */
/* ------------------------------------------------------------------ */

export function Hero({ onStart }: StartProps) {
  return (
    <section className="hero" id="top">
      <div className="container">
        <div className="hero__grid">
          <div>
            <span className="hero__badge">{typo('Знакомство — 20 минут онлайн, 500 ₽')}</span>

            <h1 className="hero__title">
              {typo('Выйти из сценария, который')} <em>повторяется</em> {typo('снова и снова')}
            </h1>

            <p className="hero__text">
              {typo(
                `Системная работа с отношениями, самооценкой и тревожными состояниями в гештальт-подходе. Первая встреча — онлайн, дальше — онлайн или очно в ${psychologist.cityIn}.`,
              )}
            </p>

            <div className="hero__actions">
              <button type="button" className="button button--primary" onClick={onStart}>
                Записаться
              </button>
              <a className="button button--secondary" href="#services">
                {typo('Услуги и цены')}
              </a>
            </div>

            <p className="hero__note">{typo('Конфиденциально, в вашем темпе, без обязательств')}</p>

            <div className="hero__stats">
              {aboutFacts.map((fact) => (
                <div key={fact.label}>
                  <span className="hero__stat-value">{typo(fact.value)}</span>
                  <span className="hero__stat-label">{typo(fact.label)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero__media">
            <img
              className="hero__photo"
              src={psychologist.photo}
              alt={`${psychologist.name} — ${psychologist.role}`}
              loading="eager"
              // Пока реального файла нет в public — подставляем заглушку,
              // чтобы на месте фото не оставалась «битая» картинка.
              onError={(event) => {
                const image = event.currentTarget;
                if (image.src.endsWith(psychologist.photoFallback)) return;
                image.src = psychologist.photoFallback;
              }}
            />
            <div className="hero__photo-card">
              <span>
                <strong>{typo('Отвечаю в течение дня')}</strong>
                <span>{typo('Подберём удобное время для первой встречи')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* О себе                                                              */
/* ------------------------------------------------------------------ */

export function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section__header" data-reveal>
          <span className="section__eyebrow">О себе</span>
          <h2 className="section__title">{psychologist.name}</h2>
          <p className="section__subtitle">{typo(psychologist.role)}</p>
        </div>

        <div className="about__grid" data-reveal>
          <div className="about__text">
            {aboutParagraphs.map((paragraph, index) => (
              <p key={index}>{typo(paragraph)}</p>
            ))}
          </div>

          <div className="about__education">
            <h3>{typo('Образование и подготовка')}</h3>
            <ul>
              {psychologist.education.map((item) => (
                <li key={item}>{typo(item)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Услуги и цены                                                       */
/* ------------------------------------------------------------------ */

export function Services({ onStart }: StartProps) {
  return (
    <section className="section section--muted" id="services">
      <div className="container">
        <div className="section__header" data-reveal>
          <span className="section__eyebrow">Услуги и цены</span>
          <h2 className="section__title">Форматы работы</h2>
          <p className="section__subtitle">
            {typo(
              'Всё начинается со знакомства: 20 минут онлайн, чтобы понять, подходим ли мы друг другу. Дальше — регулярные сессии по 60 минут, онлайн или очно в кабинете.',
            )}
          </p>
        </div>

        <div className="services__grid">
          {services.map((service, index) => (
            <article
              className={`service-card${service.badge ? ' service-card--featured' : ''}`}
              key={service.id}
              data-reveal
              style={{ '--reveal-delay': `${index * 0.1}s` } as CSSProperties}
            >
              {service.badge && <span className="service-card__badge">{typo(service.badge)}</span>}
              <h3 className="service-card__title">{typo(service.title)}</h3>
              <p className="service-card__description">{typo(service.description)}</p>

              <ul className="service-card__includes">
                {service.includes.map((item) => (
                  <li key={item}>{typo(item)}</li>
                ))}
              </ul>

              <div className="service-card__footer">
                <span className="service-card__price">{typo(service.price)}</span>
                <span className="service-card__duration">{typo(service.duration)}</span>
              </div>
            </article>
          ))}
        </div>

        <p className="services__note">
          {typo(
            'Работаю индивидуально со взрослыми — мужчинами и женщинами. Оплата после встречи переводом. Отмена или перенос — не позднее чем за 24 часа. Если у вас особая ситуация, расскажите о ней в заявке —',
          )}{' '}
          <button type="button" className="link-button" onClick={onStart}>
            {typo('обсудим отдельно')}
          </button>
          .
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Как проходит работа                                                 */
/* ------------------------------------------------------------------ */

export function Process() {
  return (
    <section className="section" id="process">
      <div className="container">
        <div className="process">
          <div className="section__header" data-reveal>
            <span className="section__eyebrow">Как проходит работа</span>
            <h2 className="section__title">{typo('Знакомство, сессии, итоги')}</h2>
          </div>

          <ol className="process__list">
            {processLines.map((line, index) => (
              <li
                className="process__item"
                key={index}
                data-reveal
                style={{ '--reveal-delay': `${index * 0.12}s` } as CSSProperties}
              >
                <span className="process__number">{index + 1}</span>
                <p>{typo(line)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Вопросы и ответы                                                    */
/* ------------------------------------------------------------------ */

export function Faq() {
  // Индекс раскрытого вопроса; null — все свёрнуты.
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section section--muted section--centered" id="faq">
      <div className="container">
        <div className="section__header" data-reveal>
          <span className="section__eyebrow">Вопросы</span>
          <h2 className="section__title">{typo('Что спрашивают перед записью')}</h2>
        </div>

        <div className="faq__list" data-reveal>
          {faq.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div className={`faq__item${isOpen ? ' faq__item--open' : ''}`} key={item.question}>
                <button
                  type="button"
                  className="faq__question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  {typo(item.question)}
                  <span className="faq__icon" aria-hidden="true">
                    +
                  </span>
                </button>
                <div className="faq__answer-wrap">
                  <p className="faq__answer" aria-hidden={!isOpen}>
                    {typo(item.answer)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Призыв к действию                                                   */
/* ------------------------------------------------------------------ */

export function CallToAction({ onStart }: StartProps) {
  const whatsapp = whatsappLink('Здравствуйте! Пишу с сайта — хочу записаться на встречу-знакомство.');

  return (
    <section className="cta" id="booking">
      <div className="container">
        <div className="cta__inner" data-reveal>
          <h2 className="cta__title">{typo('Начнём со знакомства')}</h2>
          <p className="cta__text">
            {typo(
              'Выберите удобное время — это займёт минуту. Знакомство на 20 минут онлайн: вы расскажете, что происходит, а я — как работаю. Дальше решаете сами.',
            )}
          </p>

          <div className="cta__actions">
            <button type="button" className="button button--primary" onClick={onStart}>
              {typo('Выбрать время')}
            </button>
            <a className="button button--secondary" href={psychologist.telegram} target="_blank" rel="noreferrer">
              {typo('Написать в Telegram')}
            </a>
            {whatsapp && (
              <a className="button button--secondary" href={whatsapp} target="_blank" rel="noreferrer">
                {typo('Написать в WhatsApp')}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Подвал и политика конфиденциальности                                */
/* ------------------------------------------------------------------ */

export function Footer() {
  const whatsapp = whatsappLink();

  return (
    <footer className="footer" id="contacts">
      <div className="container">
        <div className="footer__grid">
          <div>
            <h3 className="footer__title">Контакты</h3>
            <div className="footer__links">
              <a href={psychologist.telegram} target="_blank" rel="noreferrer">
                Telegram: {psychologist.telegramHandle}
              </a>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
              <span>{typo(`Очный приём: ${psychologist.city}, ${psychologist.street}`)}</span>
            </div>
          </div>

          <div>
            <h3 className="footer__title">Разделы</h3>
            <div className="footer__links">
              <a href="#about">О себе</a>
              <a href="#services">{typo('Услуги и цены')}</a>
              <a href="#process">{typo('Как проходит работа')}</a>
              <a href="/privacy">Политика конфиденциальности</a>
            </div>
          </div>
        </div>

        <div className="footer__bottom" id="privacy">
          <p>
            <strong>{typo('Политика конфиденциальности.')}</strong>{' '}
            {typo(
              `Данные из заявки (имя, телефон и описание запроса) передаются только специалисту (${psychologist.name}) через Telegram-бота и используются исключительно для организации консультации. Мы не публикуем их, не передаём третьим лицам и не используем для рекламных рассылок. Черновик заявки хранится в вашем браузере и удаляется после отправки. Отозвать согласие можно в любой момент, написав специалисту.`,
            )}
          </p>
          <p>
            {typo(
              'Сайт носит информационный характер и не является публичной офертой. Консультирование не заменяет медицинскую помощь: при острых состояниях обратитесь к врачу-психиатру.',
            )}
          </p>
          <p>
            © {new Date().getFullYear()} {psychologist.name}. {typo('Все права защищены.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
