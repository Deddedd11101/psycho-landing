/**
 * Секции лендинга: первый экран, «О психологе», «Услуги и цены»,
 * «Как проходит работа», «Отзывы», FAQ, призыв к действию, политика и подвал.
 *
 * Весь текст берётся из data/content.ts — компоненты только отрисовывают его.
 */

import { useState } from 'react';

import {
  aboutFacts,
  aboutParagraphs,
  faq,
  processSteps,
  psychologist,
  reviews,
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
              <span aria-hidden="true">🕊</span> Первая встреча — бесплатно
            </span>

            <h1 className="hero__title">
              Пространство, где можно <em>выдохнуть</em> и разобраться в себе
            </h1>

            <p className="hero__text">
              Помогаю взрослым справляться с тревогой, выгоранием и сложностями в отношениях. Работаю бережно, в вашем
              темпе — онлайн и очно в {psychologist.cityIn}.
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
              <span aria-hidden="true">🔒</span> Анонимно, конфиденциально, без обязательств
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
            />
            <div className="hero__photo-card">
              <span aria-hidden="true">💬</span>
              <span>
                <strong>Ответ в течение дня</strong>
                <span>Обычно быстрее — в течение пары часов</span>
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

        <div className="about__grid">
          <img
            className="about__photo"
            src={psychologist.photo}
            alt={`Фотография специалиста: ${psychologist.name}`}
            loading="lazy"
          />

          <div className="about__text">
            {aboutParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

            <div className="about__facts">
              {aboutFacts.map((fact) => (
                <div className="about__fact" key={fact.label}>
                  <span className="about__fact-value">{fact.value}</span>
                  <span className="about__fact-label">{fact.label}</span>
                </div>
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
            Начать можно с бесплатного знакомства — оно ни к чему не обязывает. Дальше выбираем формат, который подходит
            вам по задаче и бюджету.
          </p>
        </div>

        <div className="services__grid">
          {services.map((service) => (
            <article
              className={`service-card${service.featured ? ' service-card--featured' : ''}`}
              key={service.id}
            >
              {service.featured && <span className="service-card__badge">Чаще всего выбирают</span>}
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
          Оплата после встречи переводом. Отмена или перенос — не позднее чем за 24 часа, иначе сессия считается
          состоявшейся. Для студентов и людей в трудной ситуации есть несколько мест по сниженной стоимости —{' '}
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
            напишите в заявке
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
            Никаких сюрпризов: вы заранее знаете, что будет происходить на каждом этапе.
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
/* Отзывы                                                              */
/* ------------------------------------------------------------------ */

export function Reviews() {
  return (
    <section className="section section--muted" id="reviews">
      <div className="container">
        <div className="section__header">
          <span className="section__eyebrow">Отзывы</span>
          <h2 className="section__title">Что говорят клиенты</h2>
          <p className="section__subtitle">Опубликовано с согласия клиентов, имена изменены.</p>
        </div>

        <div className="reviews__grid">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <span className="review-card__quote" aria-hidden="true">
                “
              </span>
              <p className="review-card__text">{review.text}</p>
              <div className="review-card__author">
                <img className="review-card__avatar" src={review.avatar} alt="" loading="lazy" />
                <div>
                  <div className="review-card__name">
                    {review.name}, {review.age}
                  </div>
                  <div className="review-card__meta">запрос: {review.topic}</div>
                </div>
              </div>
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
    <section className="section" id="faq">
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

          <p className="cta__note">Бесплатное знакомство — 30 минут. Без обязательств продолжать.</p>
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
            <h3 className="footer__title">{psychologist.name}</h3>
            <p className="footer__text">
              {psychologist.role}. Работаю онлайн и очно в {psychologist.cityIn}.
            </p>
          </div>

          <div>
            <h3 className="footer__title">Контакты</h3>
            <div className="footer__links">
              <a href={psychologist.telegram} target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href={`mailto:${psychologist.email}`}>{psychologist.email}</a>
            </div>
          </div>

          <div>
            <h3 className="footer__title">Разделы</h3>
            <div className="footer__links">
              <a href="#about">О психологе</a>
              <a href="#services">Услуги и цены</a>
              <a href="#reviews">Отзывы</a>
              <a href="#privacy">Конфиденциальность</a>
            </div>
          </div>
        </div>

        <div className="footer__bottom" id="privacy">
          <p>
            <strong>Политика конфиденциальности.</strong> Данные из анкеты (имя, пол, возраст, телефон и описание
            запроса) передаются только психологу через Telegram-бота и используются исключительно для организации
            консультации. Мы не публикуем их, не передаём третьим лицам и не используем для рекламных рассылок. Черновик
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
