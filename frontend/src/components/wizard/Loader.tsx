/**
 * Прелоадер на время отправки формы.
 * Показывается вместо содержимого шага, чтобы человек понимал: запрос ушёл, идёт обработка.
 */

interface LoaderProps {
  title: string;
  hint: string;
}

export function Loader({ title, hint }: LoaderProps) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader__spinner" aria-hidden="true" />
      <p className="loader__text">{title}</p>
      <p className="loader__hint">{hint}</p>
    </div>
  );
}
