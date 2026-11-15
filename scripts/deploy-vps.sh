#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VPS_HOST="root@103.82.25.88"
VPS_DIR="/var/www/beehub"
KEY_FILE="$ROOT_DIR/scripts/.vps_key"

SSH_CMD="ssh -i $KEY_FILE -o StrictHostKeyChecking=no"
MODE="${1:-all}"

chmod 600 "$KEY_FILE"

echo "🚀 Đang đồng bộ code từ máy Mac lên VPS ($VPS_HOST)..."
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '*.tsbuildinfo' \
  --exclude '.env' \
  --exclude '.env.local' \
  -e "$SSH_CMD" \
  "$ROOT_DIR/package.json" \
  "$ROOT_DIR/package-lock.json" \
  "$VPS_HOST:$VPS_DIR/"

rsync -avz \
  --exclude 'node_modules' \
  --exclude '.env' \
  -e "$SSH_CMD" \
  "$ROOT_DIR/backend/" \
  "$VPS_HOST:$VPS_DIR/backend/"

rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '*.tsbuildinfo' \
  --exclude '.env' \
  --exclude '.env.local' \
  -e "$SSH_CMD" \
  "$ROOT_DIR/web/beehub_web/" \
  "$VPS_HOST:$VPS_DIR/web/beehub_web/"

if [[ "$MODE" == "be" ]]; then
  echo "🔄 Đang cập nhật & khởi động lại Backend trên VPS..."
  $SSH_CMD "$VPS_HOST" "cd $VPS_DIR/backend && npm install --no-audit --no-fund && pm2 restart beehub-backend"
elif [[ "$MODE" == "web" ]]; then
  echo "🔄 Đang build lại Web (Next.js) & khởi động lại trên VPS..."
  $SSH_CMD "$VPS_HOST" "cd $VPS_DIR/web/beehub_web && npm install --no-audit --no-fund && npm run build && pm2 restart beehub-web"
else
  echo "🔄 Đang cập nhật cả Backend & Build lại Web trên VPS..."
  $SSH_CMD "$VPS_HOST" "cd $VPS_DIR/backend && npm install --no-audit --no-fund && pm2 restart beehub-backend && cd $VPS_DIR/web/beehub_web && npm install --no-audit --no-fund && npm run build && pm2 restart beehub-web"
fi

echo "✅ Deploy hoàn tất!"
