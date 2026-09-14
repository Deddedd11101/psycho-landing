/**
 * Секции лендинга: первый экран, «О психологе», «Услуги и цены»,
 * «Как проходит работа», «Принципы работы», FAQ, призыв к действию, политика и подвал.
 *
 * Весь текст берётся из data/content.ts — компоненты только отрисовывают его.
 */

import { useState } from 'react';

import {
  aboutFacts,
  aboutParagraphs,
  faq,
  principles,
  processSteps,
  psychologist,
  services,
} from '../../data/content';

interface StartProps {
  /** Открыть воронку записи. */
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
            <span className="hero__badge">
              <span aria-hidden="true">🕊</span> Знакомство — 20 минут за 500 ₽
            </span>

            <h1 className="hero__title">
              Выйти из сценария, который <em>повторяется</em> снова и снова
            </h1>

            <p className="hero__text">
              Системная работа с отношениями, самооценкой и тревожными состояниями в гештальт-подходе. Онлайн из любого
              города или очно в {psychologist.cityIn}.
            </p>

            <div className="hero__actions">
              <button type="button" className="button button--primary" onClick={onStart}>
                Пройти опрос и записаться
              </button>
              <a className="button button--secondary" href="#services">
                Посмотреть услуги и цены
              </a>
            </div>

            <p className="hero__note">
              <span aria-hidden="true">🔒</span> Конфиденциально, в вашем темпе, без обязательств
            </p>

            <div className="hero__stats">
              {aboutFacts.map((fact) => (
                <div key={fact.label}>
                  <span className="hero__stat-value">{fact.value}</span>
                  <span className="hero__stat-label">{fact.label}</span>
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
              <span aria-hidden="true">💬</span>
              <span>
                <strong>Отвечаю в течение дня</strong>
                <span>Подберём удобное время для первой встречи</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* О психологе                                                         */
/* ------------------------------------------------------------------ */

export function About() {
  return (
    <section className="section" id="about">
      <div className="container">
        <div className="section__header">
          <span className="section__eyebrow">О специалисте</span>
          <h2 className="section__title">{psychologist.name}</h2>
          <p className="section__subtitle">{psychologist.role}</p>
        </div>

        {/* Фото специалиста показываем один раз — на первом экране. */}
        <div className="about__grid">
          <div className="about__text">
            {aboutParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="about__education">
            <h3>Образование и подготовка</h3>
            <ul>
              {psychologist.education.map((item) => (
                <li key={item}>{item}</li>
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
        <div className="section__header">
          <span className="section__eyebrow">Услуги и цены</span>
          <h2 className="section__title">Форматы работы</h2>
          <p className="section__subtitle">
            Начать можно со встречи-знакомства: 20 минут, чтобы понять, подходим ли мы друг другу. Дальше — регулярные
            сессии по 60 минут, онлайн или очно.
          </p>
        </div>

        <div className="services__grid">
          {services.map((service) => (
            <article className={`service-card${service.badge ? ' service-card--featured' : ''}`} key={service.id}>
              {service.badge && <span className="service-card__badge">{service.badge}</span>}
              <h3 className="service-card__title">{service.title}</h3>
              <p className="service-card__description">{service.description}</p>

              <ul className="service-card__includes">
                {service.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="service-card__footer">
                <span className="service-card__price">{service.price}</span>
                <span className="service-card__duration">{service.duration}</span>
              </div>
            </article>
          ))}
        </div>

        <p className="services__note">
          Работаю индивидуально со взрослыми — мужчинами и женщинами. Оплата после встречи переводом. Отмена или перенос
          — не позднее чем за 24 часа. Если у вас особая ситуация, расскажите о ней в анкете —{' '}
          <button
            type="button"
            onClick={onStart}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              color: 'inherit',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            обсудим отдельно
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
        <div className="section__header">
          <span className="section__eyebrow">Как проходит работа</span>
          <h2 className="section__title">Четыре понятных шага</h2>
          <p className="section__subtitle">
            Никаких сюрпризов: вы заранее знаете, что будет происходить на каждом этапе и сколько это стоит.
          </p>
        </div>

        <div className="process__grid">
          {processSteps.map((step) => (
            <article className="process-step" key={step.number}>
              <span className="process-step__number">{step.number}</span>
              <h3 className="process-step__title">{step.title}</h3>
              <p className="process-step__description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Принципы работы                                                     */
/* ------------------------------------------------------------------ */

export function Principles() {
  return (
    <section className="section section--muted" id="principles">
      <div className="container">
        <div className="section__header">
          <span className="section__eyebrow">Принципы работы</span>
          <h2 className="section__title">Как я работаю</h2>
          <p className="section__subtitle">
            Чтобы вы понимали, что вас ждёт на встрече, ещё до того, как записались.
          </p>
        </div>

        <div className="principles__grid">
          {principles.map((principle) => (
            <article className="principle-card" key={principle.id}>
              <span className="principle-card__icon" aria-hidden="true">
                {principle.icon}
              </span>
              <h3 className="principle-card__title">{principle.title}</h3>
              <p className="principle-card__text">{principle.text}</p>
            </article>
          ))}
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
    <section className="section section--centered" id="faq">
      <div className="container">
        <div className="section__header">
          <span className="section__eyebrow">Частые вопросы</span>
          <h2 className="section__title">Что обычно спрашивают</h2>
        </div>

        <div className="faq__list">
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
                  {item.question}
                  <span className="faq__icon" aria-hidden="true">
                    +
                  </span>
                </button>
                {isOpen && <p className="faq__answer">{item.answer}</p>}
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
  return (
    <section className="cta" id="booking">
      <div className="container">
        <div className="cta__inner">
          <h2 className="cta__title">Сделайте первый шаг сегодня</h2>
          <p className="cta__text">
            Ответьте на несколько вопросов — это займёт пару минут. Я заранее познакомлюсь с вашим запросом, и первая
            встреча пройдёт с пользой.
          </p>

          <div className="cta__actions">
            <button type="button" className="button button--primary" onClick={onStart}>
              Пройти опрос и записаться
            </button>
            <a className="button button--secondary" href={psychologist.telegram} target="_blank" rel="noreferrer">
              Задать вопрос в Telegram
            </a>
          </div>

          <p className="cta__note">Встреча-знакомство — 20 минут за 500 ₽. Без обязательств продолжать.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Подвал и политика конфиденциальности                                */
/* ------------------------------------------------------------------ */

export function Footer() {
  return (
    <footer className="footer" id="contacts">
      <div className="container">
        <div className="footer__grid">
          <div>
            <h3 className="footer__title">Контакты</h3>
            <div className="footer__links">
              <a href={psychologist.telegram} target="_blank" rel="noreferrer">
                Telegram: @darwina_sonia
              </a>
              <span>
                Очный приём: {psychologist.city}, {psychologist.street}
              </span>
            </div>
          </div>

          <div>
            <h3 className="footer__title">Разделы</h3>
            <div className="footer__links">
              <a href="#about">О психологе</a>
              <a href="#services">Услуги и цены</a>
              <a href="#principles">Принципы работы</a>
              <a href="#privacy">Конфиденциальность</a>
            </div>
          </div>
        </div>

        <div className="footer__bottom" id="privacy">
          <p>
            <strong>Политика конфиденциальности.</strong> Данные из анкеты (имя, пол, возраст, телефон и описание
            запроса) передаются только специалисту ({psychologist.name}) через Telegram-бота и используются
            исключительно для организации консультации. Мы не публикуем их, не передаём третьим лицам и не используем для рекламных рассылок. Черновик
            анкеты хранится в вашем браузере и удаляется после отправки. Заявка хранится на сервере не дольше 24 часов.
            Отозвать согласие можно в любой момент, написав психологу в Telegram.
          </p>
          <p>
            Сайт носит информационный характер и не является публичной офертой. Консультирование не заменяет медицинскую
            помощь: при острых состояниях обратитесь к врачу-психиатру.
          </p>
          <p>© {new Date().getFullYear()} {psychologist.name}. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
