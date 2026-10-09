#!/usr/bin/env bash
#
# E-TEST — restore (qaytarish) skripti
# Zaxiradan PostgreSQL bazasi va/yoki yuklangan hujjatlarni tiklaydi.
#
# Ishlatish:
#     ./scripts/restore.sh <db_dump.sql.gz> [uploads.tar.gz]
#
# Misol:
#     ./scripts/restore.sh backups/db_2026-06-16_02-00-00.sql.gz \
#                          backups/uploads_2026-06-16_02-00-00.tar.gz
#
# DIQQAT: bu mavjud ma'lumotlar ustiga yozadi. Avval tasdiq so'raladi.
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"

DB_DUMP="${1:-}"
UPLOADS_TAR="${2:-}"

if [ -z "$DB_DUMP" ]; then
  echo "Xato: baza dump fayli ko'rsatilmadi." >&2
  echo "Ishlatish: $0 <db_dump.sql.gz> [uploads.tar.gz]" >&2
  exit 1
fi
if [ ! -f "$DB_DUMP" ]; then
  echo "Xato: '$DB_DUMP' topilmadi." >&2
  exit 1
fi

# .env'dan DB ma'lumotlari
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
fi
DB_USERNAME="${DB_USERNAME:-etest}"
DB_NAME="${DB_NAME:-etest}"

echo "DIQQAT: '$DB_NAME' bazasi va uploads MAVJUD ma'lumotlari ustiga yoziladi."
read -r -p "Davom etilsinmi? (ha/yo'q): " ANSWER
if [ "$ANSWER" != "ha" ]; then
  echo "Bekor qilindi."
  exit 0
fi

# 1) Bazani tiklash
echo "[1/2] Baza tiklanmoqda: $DB_DUMP"
# Mavjud ulanishlarni uzib, bazani toza holatga keltiramiz
$COMPOSE exec -T postgres psql -U "$DB_USERNAME" -d "$DB_NAME" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "$DB_DUMP" | $COMPOSE exec -T postgres psql -U "$DB_USERNAME" -d "$DB_NAME"
echo "  ✓ Baza tiklandi."

# 2) Uploads tiklash (ixtiyoriy)
if [ -n "$UPLOADS_TAR" ]; then
  if [ ! -f "$UPLOADS_TAR" ]; then
    echo "Xato: '$UPLOADS_TAR' topilmadi." >&2
    exit 1
  fi
  echo "[2/2] Uploads tiklanmoqda: $UPLOADS_TAR"
  # Eski uploads tarkibini tozalab, arxivni /app ga ochamiz (uploads/ ichida)
  $COMPOSE run --rm --no-deps -T --entrypoint sh backend \
    -c "rm -rf /app/uploads/* && cat > /tmp/u.tar.gz && tar xzf /tmp/u.tar.gz -C /app && rm /tmp/u.tar.gz" \
    <"$UPLOADS_TAR"
  echo "  ✓ Uploads tiklandi."
else
  echo "[2/2] Uploads arxivi berilmadi — o'tkazib yuborildi."
fi

echo "Tugadi. Backend'ni qayta ishga tushiring: $COMPOSE restart backend"
