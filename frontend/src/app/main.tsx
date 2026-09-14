/**
 * Точка входа Mini App (страница /app).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AdminApp } from './AdminApp';
import '../styles/admin.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Не найден элемент #root — проверьте app.html');
}

createRoot(container).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
