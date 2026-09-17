/**
 * Корневой компонент: лендинг + модальная воронка записи.
 * Состояние здесь одно — открыта воронка или нет; всё остальное живёт внутри WizardModal.
 */

import { useCallback, useEffect, useState } from 'react';

import { Header } from './components/landing/Header';
import { Seo } from './components/landing/Seo';
import {
  About,
  CallToAction,
  Faq,
  Footer,
  Hero,
  Process,
  Services,
} from './components/landing/Sections';
import { WizardModal } from './components/wizard/WizardModal';

/**
 * Плавное появление блоков при прокрутке.
 * Навешивает класс is-visible на элементы с data-reveal, когда они входят в экран.
 * Без JS класс .js на html не ставится, и блоки видны сразу (см. global.css).
 */
function useReveal(): void {
  useEffect(() => {
    document.documentElement.classList.add('js');

    // Системная настройка «меньше движения» — показываем всё сразу.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          // Появились один раз — дальше не следим.
          observer.unobserve(entry.target);
        }
      },
      // Срабатывает, когда элемент показался на 12 % — чуть раньше, чем целиком.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

export function App() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  useReveal();

  const openWizard = useCallback(() => setIsWizardOpen(true), []);
  const closeWizard = useCallback(() => setIsWizardOpen(false), []);

  return (
    <>
      <Header onStart={openWizard} />

      <main>
        <Hero onStart={openWizard} />
        <About />
        <Services onStart={openWizard} />
        <Process />
        <Faq />
        <CallToAction onStart={openWizard} />
      </main>

      <Footer />

      <WizardModal isOpen={isWizardOpen} onClose={closeWizard} />
      <Seo />
    </>
  );
}
