#!/usr/bin/env bash
#
# Обновление приложения на сервере после изменений в репозитории.
# Запускать от root:  bash /opt/psycho/deploy/update.sh
#
# Тянет свежий код, ставит зависимости, пересобирает фронтенд и перезапускает сервис.

set -euo pipefail

APP_DIR="/opt/psycho"
APP_USER="psycho"

echo "==> Обновляем код"
sudo -u "${APP_USER}" -H git -C "${APP_DIR}" pull --ff-only

echo "==> Зависимости и сборка"
sudo -u "${APP_USER}" -H bash -c "cd '${APP_DIR}' && npm ci --no-audit --no-fund && npm run build"

echo "==> Перезапуск"
systemctl restart psycho
sleep 2
systemctl --no-pager status psycho | head -5

echo "==> Готово"
