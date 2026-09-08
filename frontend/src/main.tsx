/**
 * Точка входа фронтенда: монтирует React-приложение и подключает стили.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/global.css';
import './styles/landing.css';
import './styles/wizard.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Не найден элемент #root — проверьте index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
