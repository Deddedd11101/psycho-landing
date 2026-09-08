/**
 * Корневой компонент: лендинг + модальная воронка записи.
 * Состояние здесь одно — открыта воронка или нет; всё остальное живёт внутри WizardModal.
 */

import { useCallback, useState } from 'react';

import { Header } from './components/landing/Header';
import {
  About,
  CallToAction,
  Faq,
  Footer,
  Hero,
  Principles,
  Process,
  Services,
} from './components/landing/Sections';
import { WizardModal } from './components/wizard/WizardModal';

export function App() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

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
        <Principles />
        <Faq />
        <CallToAction onStart={openWizard} />
      </main>

      <Footer />

      <WizardModal isOpen={isWizardOpen} onClose={closeWizard} />
    </>
  );
}
