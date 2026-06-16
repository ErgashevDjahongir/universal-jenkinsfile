#!/usr/bin/env bash
#
# E-TEST — backup skripti
# PostgreSQL bazasi + yuklangan hujjatlar (uploads volume) ni zaxiraga oladi.
#
# Qo'lda ishga tushirish:
#     ./scripts/backup.sh
#
# Har kuni avtomatik (cron, masalan 02:00):
#     crontab -e
#     0 2 * * * /opt/etest/scripts/backup.sh >> /var/log/etest-backup.log 2>&1
#
# Sozlanadigan (env orqali):
#     BACKUP_DIR       — zaxira papkasi (standart: <loyiha>/backups)
#     RETENTION_DAYS   — necha kundan eski zaxiralar o'chiriladi (standart: 30)
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"

# .env'dan DB ma'lumotlarini o'qiymiz
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
fi
DB_USERNAME="${DB_USERNAME:-etest}"
DB_NAME="${DB_NAME:-etest}"

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%F %T')] Backup boshlandi -> $BACKUP_DIR"

# 1) PostgreSQL dump (gzip bilan siqilgan)
DB_FILE="$BACKUP_DIR/db_${STAMP}.sql.gz"
$COMPOSE exec -T postgres pg_dump -U "$DB_USERNAME" "$DB_NAME" | gzip >"$DB_FILE"
echo "  ✓ Baza      -> $(basename "$DB_FILE") ($(du -h "$DB_FILE" | cut -f1))"

# 2) Yuklangan hujjatlar (candidate PDF + savol rasmlari)
#    backend xizmatida etest_uploads volume /app/uploads ga ulangan.
#    --no-deps: postgres/redis'ni qayta ishga tushirmaymiz.
UPLOADS_FILE="$BACKUP_DIR/uploads_${STAMP}.tar.gz"
$COMPOSE run --rm --no-deps -T --entrypoint sh backend \
  -c "tar czf - -C /app uploads" >"$UPLOADS_FILE"
echo "  ✓ Uploads   -> $(basename "$UPLOADS_FILE") ($(du -h "$UPLOADS_FILE" | cut -f1))"

# 3) Eski zaxiralarni tozalash
find "$BACKUP_DIR" -maxdepth 1 -name 'db_*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete
find "$BACKUP_DIR" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime +"$RETENTION_DAYS" -print -delete

echo "[$(date '+%F %T')] Backup tugadi. ${RETENTION_DAYS} kundan eski zaxiralar o'chirildi."
