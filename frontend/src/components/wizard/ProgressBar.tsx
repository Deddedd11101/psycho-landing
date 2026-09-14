/**
 * Индикатор прогресса воронки: пронумерованные точки и соединяющие их линии.
 * Пройденные шаги отмечаются галочкой, текущий подсвечивается.
 * Текстовая подпись «Шаг N из 4» выводится в заголовке окна (см. WizardModal).
 */

interface ProgressBarProps {
  /** Номер текущего шага, начиная с 1. */
  current: number;
  /** Подписи шагов — их количество задаёт число точек. */
  labels: string[];
}

export function ProgressBar({ current, labels }: ProgressBarProps) {
  return (
    <div className="progress">
      <div
        className="progress__steps"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={labels.length}
        aria-valuenow={current}
        aria-label={`Шаг ${current} из ${labels.length}`}
      >
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < current;
          const isActive = stepNumber === current;
          const modifier = isDone ? ' progress__step--done' : isActive ? ' progress__step--active' : '';

          return (
            <div className={`progress__step${modifier}`} key={label}>
              <span className="progress__dot" aria-hidden="true">
                {isDone ? '✓' : stepNumber}
              </span>
              {/* После последней точки линия не нужна. */}
              {stepNumber < labels.length && (
                <span className="progress__line" aria-hidden="true">
                  <span />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
