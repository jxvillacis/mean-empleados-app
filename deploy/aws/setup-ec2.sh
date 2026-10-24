#!/usr/bin/env bash
# Preparación única de la EC2 (Ubuntu 24.04) para el backend: Node.js LTS, git, herramientas de compilación, Nginx
# como proxy inverso con HTTPS (Let's Encrypt), PM2 con arranque automático y rotación de logs, y la llave SSH que
# GitHub usará como deploy key. Es idempotente: se puede volver a ejecutar.
#
# Uso: subir este script y deploy/nginx/mean-api.conf al home de la EC2 (scp) y ejecutar allí:
#   bash setup-ec2.sh [correo para avisos de Let's Encrypt]   (sin correo: registro sin avisos de vencimiento)
set -euo pipefail
CORREO=${1:-}
APP_DIR=/var/www/mean-empleados
IP=$(curl -fsS https://checkip.amazonaws.com)
DOMINIO="${IP//./-}.sslip.io"   # nombre público que resuelve a la IP elástica (Let's Encrypt no emite para IPs)
echo "IP pública: $IP · dominio: $DOMINIO"

echo "== 1. Sistema, Node.js LTS (NodeSource), git, build-essential y Nginx"
sudo apt-get update -y && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt-get install -y nodejs   # incluye npm: no instalar el paquete npm de Ubuntu encima
fi
sudo apt-get install -y git build-essential nginx certbot python3-certbot-nginx
node -v && npm -v

echo "== 2. Memoria de intercambio (1 GB): npm ci en una t3.micro de 1 GB de RAM"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== 3. PM2 global, arranque con el sistema y rotación de logs"
sudo npm install -g pm2
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME"
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

echo "== 4. Directorio de la app y archivo de secretos (fuera del repositorio)"
sudo mkdir -p "$APP_DIR/shared/logs" && sudo chown -R "$USER:$USER" "$APP_DIR"
if [ ! -f "$APP_DIR/shared/backend.env" ]; then
  cat > "$APP_DIR/shared/backend.env" <<EOF
MONGO_URI=<cadena de MongoDB Atlas>
PORT=3000
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=<https://tu-app.azurewebsites.net>
ALERT_WEBHOOK_URL=<webhook de Discord>
EOF
  echo "Creado $APP_DIR/shared/backend.env: completar MONGO_URI, CORS_ORIGIN y ALERT_WEBHOOK_URL con nano."
fi
chmod 600 "$APP_DIR/shared/backend.env"

echo "== 5. Nginx: proxy inverso del puerto 80 al 3000"
CONF=/etc/nginx/sites-available/default
[ -f "$HOME/mean-api.conf" ] || { echo "Falta ~/mean-api.conf: subirlo junto con este script (scp)"; exit 1; }
sudo cp "$HOME/mean-api.conf" "$CONF"
sudo sed -i "s/__DOMINIO__/$DOMINIO/" "$CONF"
sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 'Nginx Full' >/dev/null || true   # el firewall efectivo es el grupo de seguridad de AWS

echo "== 6. HTTPS con Let's Encrypt (Certbot agrega el 443 y redirige el 80)"
if [ -n "$CORREO" ]; then REGISTRO=(-m "$CORREO"); else REGISTRO=(--register-unsafely-without-email); fi
sudo certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos "${REGISTRO[@]}" --redirect || \
  echo "AVISO: Certbot no pudo emitir el certificado; la API sigue disponible por http://$DOMINIO"
# Certbot deja un 404 para los pedidos al 80 cuyo Host no es el dominio (p. ej. http://<IP>): se redirigen a HTTPS
sudo sed -i "s#^\s*return 404; \# managed by Certbot#    return 301 https://$DOMINIO\$request_uri; \# acceso por IP#" "$CONF"
sudo nginx -t && sudo systemctl reload nginx

echo "== 7. Llave SSH para GitHub (deploy key de solo lectura)"
[ -f "$HOME/.ssh/id_ed25519" ] || ssh-keygen -t ed25519 -C "servidor-produccion" -f "$HOME/.ssh/id_ed25519" -N ''
ssh-keyscan -t ed25519 github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null
echo; echo "Pegar esta llave en GitHub → Settings → Deploy keys (sin permiso de escritura):"; cat "$HOME/.ssh/id_ed25519.pub"
echo; echo "Listo. API: https://$DOMINIO/api/v1/empleados (tras el primer pm2 deploy)"
