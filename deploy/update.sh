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

echo "==> Обновляем systemd-юнит и nginx (если менялись)"
install -m 644 "${APP_DIR}/deploy/psycho.service" /etc/systemd/system/psycho.service
systemctl daemon-reload
SERVER_NAME="$(grep -oP 'server_name \K[^;]+' /etc/nginx/sites-available/psycho | head -1)"
sed "s/__SERVER_NAME__/${SERVER_NAME}/" "${APP_DIR}/deploy/nginx.conf" > /etc/nginx/sites-available/psycho.new
if ! grep -q "ssl_certificate" /etc/nginx/sites-available/psycho; then
  mv /etc/nginx/sites-available/psycho.new /etc/nginx/sites-available/psycho && nginx -t && systemctl reload nginx
else
  # Конфиг уже дополнен certbot — не затираем его автоматически.
  rm -f /etc/nginx/sites-available/psycho.new
  echo "   nginx-конфиг содержит HTTPS-блок certbot, пропускаем автообновление"
fi

echo "==> Перезапуск"
systemctl restart psycho
sleep 2
systemctl --no-pager status psycho | head -5

echo "==> Готово"
