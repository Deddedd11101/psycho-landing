/**
 * Микроразметка Schema.org и счётчик Яндекс.Метрики.
 *
 * JSON-LD помогает поисковикам понять, что это страница специалиста с адресом,
 * ценами и списком вопросов-ответов, — и показывать расширенный сниппет.
 * Метрика подключается только если задан VITE_YM_ID (см. .env), и только
 * после того, как посетитель принял баннер про cookie.
 */

import { useEffect, useState } from 'react';

import { faq, psychologist, services } from '../../data/content';

const SITE_URL = 'https://darwina.ru';

/** Идентификатор счётчика Метрики; пусто — аналитика выключена. */
const METRIKA_ID = (import.meta.env.VITE_YM_ID as string | undefined)?.trim() ?? '';

const CONSENT_KEY = 'psycho-analytics-consent';

/** Структурированные данные о специалисте, услугах и вопросах. */
function buildJsonLd(): object[] {
  const business = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/#business`,
    name: `${psychologist.name} — психолог, гештальт-терапевт`,
    url: SITE_URL,
    image: `${SITE_URL}/og-image.jpg`,
    description:
      'Психолог, гештальт-терапевт. Работа с отношениями, самооценкой и тревожными состояниями. Онлайн и очно в Ростове-на-Дону.',
    priceRange: '500–1500 ₽',
    address: {
      '@type': 'PostalAddress',
      addressLocality: psychologist.city,
      streetAddress: psychologist.street,
      addressCountry: 'RU',
    },
    areaServed: ['Ростов-на-Дону', 'Россия (онлайн)'],
    sameAs: [psychologist.telegram],
    ...(psychologist.whatsapp ? { telephone: `+${psychologist.whatsapp}` } : {}),
    founder: { '@id': `${SITE_URL}/#person` },
    makesOffer: services.map((service) => ({
      '@type': 'Offer',
      name: service.title,
      description: service.description,
      price: service.price.replace(/[^\d]/g, ''),
      priceCurrency: 'RUB',
    })),
  };

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: psychologist.name,
    jobTitle: psychologist.role,
    image: `${SITE_URL}${psychologist.photo}`,
    url: SITE_URL,
    sameAs: [psychologist.telegram],
    worksFor: { '@id': `${SITE_URL}/#business` },
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return [business, person, faqPage];
}

/** Загружает счётчик Метрики. Вызывается один раз после согласия. */
function loadMetrika(id: string): void {
  const w = window as Window & { ym?: (...args: unknown[]) => void };
  if (w.ym) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
  document.head.appendChild(script);

  // Стандартная заглушка: складывает вызовы до загрузки скрипта.
  const queue: unknown[][] = [];
  w.ym = (...args: unknown[]) => {
    queue.push(args);
  };
  (w.ym as { a?: unknown[][]; l?: number }).a = queue;
  (w.ym as { a?: unknown[][]; l?: number }).l = Date.now();
  w.ym(Number(id), 'init', {
    ssr: true,
    referrer: document.referrer,
    url: location.href,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    // Вебвизор записывает сеансы — для сайта психолога это лишнее.
    webvisor: false,
  });
}

/** Отправляет цель в Метрику (например, «заявка отправлена»). Без счётчика — молча ничего. */
export function trackGoal(name: string): void {
  const w = window as Window & { ym?: (...args: unknown[]) => void };
  if (!METRIKA_ID || !w.ym) return;
  w.ym(Number(METRIKA_ID), 'reachGoal', name);
}

export function Seo() {
  const [consent, setConsent] = useState<'unknown' | 'yes' | 'no'>('unknown');

  // JSON-LD вставляем в head один раз.
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(buildJsonLd());
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  // Согласие на аналитику: читаем сохранённый выбор.
  useEffect(() => {
    if (!METRIKA_ID) return;
    try {
      const saved = window.localStorage.getItem(CONSENT_KEY);
      if (saved === 'yes' || saved === 'no') setConsent(saved);
    } catch {
      // Приватный режим — просто покажем баннер ещё раз.
    }
  }, []);

  useEffect(() => {
    if (METRIKA_ID && consent === 'yes') loadMetrika(METRIKA_ID);
  }, [consent]);

  function choose(value: 'yes' | 'no'): void {
    setConsent(value);
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Не критично.
    }
  }

  if (!METRIKA_ID || consent !== 'unknown') return null;

  return (
    <div className="cookie" role="dialog" aria-label="Использование cookie">
      <p className="cookie__text">
        Сайт использует счётчик посещаемости (Яндекс Метрика). Он не собирает содержимое заявок — только
        обезличенную статистику. Подробнее — в{' '}
        <a href="/privacy" target="_blank" rel="noreferrer">
          политике конфиденциальности
        </a>
        .
      </p>
      <div className="cookie__actions">
        <button type="button" className="button button--primary" onClick={() => choose('yes')}>
          Хорошо
        </button>
        <button type="button" className="button button--ghost" onClick={() => choose('no')}>
          Без статистики
        </button>
      </div>
    </div>
  );
}
