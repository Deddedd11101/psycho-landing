/**
 * Фиксированная шапка сайта: логотип, якорная навигация и кнопка записи.
 * На мобильных навигация прячется в выпадающее меню.
 */

import { useEffect, useState } from 'react';

import { navLinks, psychologist } from '../../data/content';

interface HeaderProps {
  /** Открыть воронку записи. */
  onStart: () => void;
}

export function Header({ onStart }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // После прокрутки добавляем шапке границу и тень — так она отделяется от контента.
  useEffect(() => {
    function handleScroll(): void {
      setIsScrolled(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header${isScrolled ? ' header--scrolled' : ''}`}>
      <div className="container">
        <div className="header__inner">
          <a className="header__logo" href="#top">
            <img className="header__logo-mark" src="/icon-192.png" alt="" width="36" height="36" />
            <span className="header__logo-text">
              {psychologist.name}
              <small>{psychologist.roleShort}</small>
            </span>
          </a>

          <nav className="header__nav" aria-label="Основная навигация">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <button type="button" className="button button--primary header__cta" onClick={onStart}>
              Записаться
            </button>
            <button
              type="button"
              className="header__burger"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span />
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="header__mobile-menu" aria-label="Мобильная навигация">
            {navLinks.map((link) => (
              // Клик по пункту закрывает меню, иначе оно перекроет секцию.
              <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setIsMenuOpen(false);
                onStart();
              }}
            >
              Записаться
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
