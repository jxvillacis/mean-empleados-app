#!/usr/bin/env bash
# Lo ejecuta pm2 deploy en la EC2 después de cada git pull (directorio: <APP_DIR>/source).
# Instala dependencias, compila el backend y recarga los procesos sin tiempo de caída.
set -euo pipefail
APP_DIR=/var/www/mean-empleados

# Los secretos viven fuera del repositorio, en shared/ (se crea una sola vez, ver deploy/README.md)
if [ ! -f "$APP_DIR/shared/backend.env" ]; then
  echo "Falta $APP_DIR/shared/backend.env (MONGO_URI, JWT_SECRET, CORS_ORIGIN, ALERT_WEBHOOK_URL)" >&2
  exit 1
fi
ln -sfn "$APP_DIR/shared/backend.env" backend/.env
mkdir -p "$APP_DIR/shared/logs"

echo "== Backend: dependencias y compilación"
(cd backend && npm ci --no-audit --no-fund && npm run build)

echo "== Notificador de alertas: dependencias"
(cd deploy/pm2-alertas && npm ci --omit=dev --no-audit --no-fund)

echo "== PM2: recarga en caliente (cluster) y guardado de la lista de procesos"
pm2 startOrReload ecosystem.config.js --env production
pm2 save
