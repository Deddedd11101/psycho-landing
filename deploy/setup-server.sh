#!/usr/bin/env bash
#
# Первичная настройка чистого сервера Ubuntu/Debian под проект.
# Запускается от root ОДИН раз:
#
#   bash deploy/setup-server.sh <домен-или-IP> <git-url>
#
# Что делает:
#   1. Ставит Node.js 22, nginx, git, certbot, ufw.
#   2. Создаёт системного пользователя psycho (приложение не работает от root).
#   3. Клонирует репозиторий в /opt/psycho, ставит зависимости, собирает фронтенд.
#   4. Устанавливает systemd-юнит и конфиг nginx.
#   5. Открывает в файрволе только SSH, HTTP и HTTPS.
#
# Файл .env скрипт НЕ создаёт — его нужно положить в /opt/psycho/.env отдельно
# (в нём секреты: токен бота и chat_id). Потом: systemctl restart psycho
#
# Скрипт идемпотентный: повторный запуск ничего не сломает.

set -euo pipefail

SERVER_NAME="${1:?Укажите домен или IP сервера первым аргументом}"
REPO_URL="${2:?Укажите git-url репозитория вторым аргументом}"
APP_DIR="/opt/psycho"
APP_USER="psycho"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запускайте от root" >&2
  exit 1
fi

log "Обновляем пакеты и ставим базовые утилиты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q curl git nginx ufw ca-certificates gnupg

log "Ставим Node.js 22 (NodeSource)"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi
node -v && npm -v

log "Ставим certbot для HTTPS (понадобится после привязки домена)"
apt-get install -y -q certbot python3-certbot-nginx

log "Создаём пользователя ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "/home/${APP_USER}" --shell /usr/sbin/nologin "${APP_USER}"
fi

log "Клонируем/обновляем репозиторий в ${APP_DIR}"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

log "Устанавливаем зависимости и собираем фронтенд"
# Сборка выполняется от пользователя приложения, чтобы node_modules не принадлежали root.
sudo -u "${APP_USER}" -H bash -c "cd '${APP_DIR}' && npm ci --no-audit --no-fund && npm run build"

log "Устанавливаем systemd-юнит"
install -m 644 "${APP_DIR}/deploy/psycho.service" /etc/systemd/system/psycho.service
systemctl daemon-reload
systemctl enable psycho >/dev/null

log "Настраиваем nginx"
sed "s/__SERVER_NAME__/${SERVER_NAME}/" "${APP_DIR}/deploy/nginx.conf" > /etc/nginx/sites-available/psycho
ln -sf /etc/nginx/sites-available/psycho /etc/nginx/sites-enabled/psycho
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

log "Файрвол: разрешаем SSH, HTTP, HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status | head -8

if [[ -f "${APP_DIR}/.env" ]]; then
  log "Найден .env — запускаем приложение"
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  systemctl restart psycho
  sleep 3
  systemctl --no-pager status psycho | head -5
else
  log "ВНИМАНИЕ: файла ${APP_DIR}/.env нет. Положите его и выполните: systemctl restart psycho"
fi

log "Готово. Сайт: http://${SERVER_NAME}"
echo "Логи приложения: journalctl -u psycho -f"
echo "Обновить после изменений в git: bash ${APP_DIR}/deploy/update.sh"
