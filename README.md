# E-TEST — Production o'rnatish qo'llanmasi

Xodimlar va nomzodlarni test sinovidan o'tkazish platformasi. Ushbu qo'llanma
ilovani **lokal tarmoqdagi Ubuntu Server 22.04** ga (~100 bir vaqtdagi test
topshiruvchi) o'rnatishni bosqichma-bosqich tushuntiradi.

> Loyihaning to'liq texnik talablari: `docs/TZ.md`.
> Bu qo'llanma faqat production joylashtirish (deployment) haqida.

---

## Arxitektura (production)

```
                 ┌─────────────────────────────────────────────┐
   Brauzer  ───▶ │  frontend (Nginx) :80                        │
 (lokal tarmoq)  │   ├─ React SPA static fayllari               │
                 │   └─ /api/*  ──proxy──▶  backend (NestJS) :3000
                 └───────────────────────────────────┬─────────┘
                              ichki tarmoq (etest_net)│
                            ┌──────────────┬──────────┴──────────┐
                            ▼              ▼                      ▼
                     PostgreSQL 18      Redis 7           uploads (volume)
                     (etest_pgdata)  (etest_redisdata)   (etest_uploads)
```

- Tashqariga **faqat 80-port** (Nginx) ochiladi. PostgreSQL, Redis va backend
  faqat ichki Docker tarmog'ida — tashqi portga chiqarilmaydi.
- Frontend Nginx orqali bir xil origin'da ishlaydi va `/api` so'rovlarini
  backend'ga proxy qiladi (brauzer uchun alohida CORS muammosi yo'q).
- **Yuklangan hujjatlar (candidate PDF) faqat backend orqali, autentifikatsiya
  bilan beriladi** — Nginx ularni to'g'ridan-to'g'ri ochmaydi.

Fayllar:

| Fayl                      | Vazifasi                                              |
| ------------------------- | ----------------------------------------------------- |
| `docker-compose.prod.yml` | Barcha xizmatlar (postgres, redis, backend, frontend) |
| `backend/Dockerfile`      | Backend multi-stage build (yengil prod image)         |
| `frontend/Dockerfile`     | Frontend build → Nginx                                |
| `frontend/nginx.conf`     | Nginx server konfiguratsiyasi                         |
| `.env.prod.example`       | Production env namunasi                               |
| `scripts/backup.sh`       | Baza + uploads zaxirasi                               |
| `scripts/restore.sh`      | Zaxiradan qaytarish                                   |

---

## 1. Ubuntu Server tayyorlash

### 1.1. Docker o'rnatish

```bash
# Eski versiyalarni olib tashlash (agar bo'lsa)
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Kerakli paketlar
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# Docker rasmiy GPG kaliti
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Docker apt manbasi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker Engine + Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Joriy foydalanuvchini docker guruhiga qo'shish (sudo'siz ishlatish uchun)
sudo usermod -aG docker "$USER"
# Bu o'zgarish kuchga kirishi uchun qaytadan login qiling (yoki: newgrp docker)
```

Tekshirish:

```bash
docker --version
docker compose version
```

### 1.2. Loyihani olish

```bash
sudo mkdir -p /opt/etest
sudo chown "$USER":"$USER" /opt/etest
git clone https://github.com/raxmonovmirjalol/examlocal.git /opt/etest
cd /opt/etest
```

---

## 2. Konfiguratsiya (.env)

```bash
cp .env.prod.example .env
nano .env
```

`.env` ichidagi **🔴 O'ZGARTIRING** belgili barcha qatorlarni to'ldiring:

| O'zgaruvchi           | Izoh                                               |
| --------------------- | -------------------------------------------------- |
| `DB_PASSWORD`         | Kuchli baza paroli — `openssl rand -base64 24`     |
| `JWT_SECRET`          | Kuchli tasodifiy kalit — `openssl rand -hex 32`    |
| `SEED_ADMIN_PASSWORD` | Birinchi admin paroli (kamida 8 belgi, harf+raqam) |
| `CORS_ORIGIN`         | Server manzili, masalan `http://192.168.1.50`      |
| `HTTP_PORT`           | Tashqi port (standart `80`)                        |

Kuchli qiymatlar yaratish:

```bash
openssl rand -hex 32      # JWT_SECRET uchun
openssl rand -base64 24   # DB_PASSWORD uchun
```

> **Muhim:** `JWT_SECRET` va `DB_PASSWORD` standart/namuna qiymatda qolsa,
> backend ishga tushganda ogohlantirish beradi yoki to'xtaydi. Refresh token
> JWT emas — u Redis'da saqlanadi, shu sababli alohida refresh kaliti kerak emas.

---

## 3. Ishga tushirish

```bash
cd /opt/etest

# Image'larni qurish va konteynerlarni ishga tushirish
docker compose -f docker-compose.prod.yml up -d --build

# Holatni ko'rish
docker compose -f docker-compose.prod.yml ps
```

Barcha xizmatlar `healthy` bo'lguncha kuting (postgres → redis → backend → frontend).

### 3.1. Migratsiya (baza sxemasini yaratish)

Birinchi ishga tushirishda baza bo'sh. Migratsiyalarni qo'llang:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run migration:run:prod
```

### 3.2. Boshlang'ich super-admin yaratish

```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed:admin:prod
```

Bu `.env`'dagi `SEED_ADMIN_LOGIN` / `SEED_ADMIN_PASSWORD` bilan super-admin
yaratadi (idempotent — login allaqachon mavjud bo'lsa o'tkazib yuboradi).

### 3.3. Tekshirish

```bash
# Backend sog'ligi
curl http://localhost/api/health
# {"status":"ok","database":"up","timestamp":"..."}

# Brauzerda oching:
#   http://<SERVER_IP>/        (frontend)
#   http://<SERVER_IP>/api/docs (Swagger)
```

Super-admin login va parol bilan kiring.

---

## 4. Kundalik boshqaruv

```bash
# Loglar (jonli)
docker compose -f docker-compose.prod.yml logs -f backend

# Qayta ishga tushirish
docker compose -f docker-compose.prod.yml restart backend

# To'xtatish (ma'lumotlar saqlanadi)
docker compose -f docker-compose.prod.yml down

# Yangilanishdan keyin qayta qurish
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npm run migration:run:prod
```

> Ma'lumotlar nomli volume'larda (`etest_pgdata`, `etest_redisdata`,
> `etest_uploads`) saqlanadi — `down` qilganda ham yo'qolmaydi.
> **`down -v` ni ISHLATMANG** — u volume'larni (barcha ma'lumotni) o'chiradi.

---

## 5. Backup va Restore

### 5.1. Zaxira olish

```bash
./scripts/backup.sh
```

Bu `backups/` papkasida sana bilan nomlangan ikki fayl yaratadi:

```
backups/db_2026-06-16_02-00-00.sql.gz       # PostgreSQL bazasi
backups/uploads_2026-06-16_02-00-00.tar.gz  # Yuklangan hujjatlar
```

30 kundan eski zaxiralar avtomatik o'chiriladi
(`RETENTION_DAYS` env bilan o'zgartiriladi).

### 5.2. Avtomatik (cron) — har kuni 02:00

```bash
crontab -e
```

Quyidagi qatorni qo'shing:

```
0 2 * * * /opt/etest/scripts/backup.sh >> /var/log/etest-backup.log 2>&1
```

> Maslahat: zaxiralarni vaqti-vaqti bilan boshqa diskka yoki tarmoq
> saqlagichiga ham nusxalang (server diski ishdan chiqsa himoya bo'ladi).

### 5.3. Qaytarish (restore)

```bash
./scripts/restore.sh backups/db_2026-06-16_02-00-00.sql.gz \
                     backups/uploads_2026-06-16_02-00-00.tar.gz
```

Skript tasdiq so'raydi (`ha` deb yozing), bazani tiklaydi va uploads'ni qaytaradi.
So'ng backend'ni qayta ishga tushiring:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 6. Muammolarni hal qilish

| Muammo                                            | Sabab / Yechim                                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Port 80 band**                                  | Boshqa xizmat 80'ni egallagan. `.env`'da `HTTP_PORT=8080` qo'ying va qayta ishga tushiring. Bandlikni tekshirish: `sudo ss -tlnp \| grep :80`                             |
| **Backend to'xtaydi: "JWT_SECRET o'rnatilmagan"** | `.env`'da `JWT_SECRET` to'ldirilmagan. Kuchli kalit qo'ying (`openssl rand -hex 32`).                                                                                     |
| **Backend to'xtaydi: "DB_PASSWORD ... majburiy"** | Production'da `DB_PASSWORD` bo'sh. `.env`'ni to'ldiring.                                                                                                                  |
| **Login/API ishlamayapti, CORS xatosi**           | `CORS_ORIGIN` server manziliga mos emas. `.env`'da to'g'ri IP/domen qo'ying (masalan `http://192.168.1.50`), backend'ni qayta ishga tushiring.                            |
| **Frontend ochiladi, lekin /api 502**             | Backend hali `healthy` emas yoki yiqilgan. `docker compose -f docker-compose.prod.yml logs backend` bilan tekshiring.                                                     |
| **Migratsiya "relation does not exist"**          | Migratsiya ishlatilmagan. `... exec backend npm run migration:run:prod`.                                                                                                  |
| **"password authentication failed"**              | `.env`'dagi `DB_PASSWORD` volume'dagi eski paroldan farq qiladi. Yangi bazada: volume'ni qayta yarating (ehtiyot bo'ling — ma'lumot o'chadi) yoki eski parolni ishlating. |
| **bcrypt xatosi build vaqtida**                   | Internet/registry muammosi. Build'ni qayta urinib ko'ring: `docker compose -f docker-compose.prod.yml build --no-cache backend`.                                          |

Foydali buyruqlar:

```bash
# Konteyner holati va healthcheck
docker compose -f docker-compose.prod.yml ps

# Bitta xizmat loglari
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Konteyner ichiga kirish
docker compose -f docker-compose.prod.yml exec backend sh
```

---

## 7. Kelajakda internetga chiqarish (HTTPS, domen)

Hozir tizim **lokal tarmoq** uchun sozlangan (HTTP, ichki IP). Internetga
ochishdan oldin quyidagilar **majburiy**:

1. **Domen va HTTPS (TLS):**
   - Domen oling va serverning ommaviy IP'siga yo'naltiring.
   - Frontend Nginx oldiga TLS terminatsiya qo'shing. Eng oson yo'l —
     **Caddy** yoki **Traefik** reverse-proxy (Let's Encrypt sertifikatini
     avtomatik oladi), yoki `certbot` bilan Nginx'ga sertifikat o'rnating.
   - `CORS_ORIGIN` ni `https://domeningiz` ga o'zgartiring.

2. **Xavfsizlik sozlamalari:**
   - Faqat 80/443 portlarni tashqariga oching (`ufw`):
     ```bash
     sudo ufw allow 80/tcp
     sudo ufw allow 443/tcp
     sudo ufw allow OpenSSH
     sudo ufw enable
     ```
   - HTTP→HTTPS yo'naltirish va HSTS sarlavhasini qo'shing.
   - Rate limiting (Nginx `limit_req`) — login va API uchun.
   - `JWT_SECRET`, `DB_PASSWORD` ni internetga chiqishdan oldin yangilang.

3. **Ishonchlilik:**
   - Avtomatik backup'ni boshqa joyga (off-site) nusxalashni yo'lga qo'ying.
   - Monitoring (`docker stats`, log yig'ish) qo'shing.
   - Redis va Postgres uchun resurs limitlarini qayta ko'rib chiqing.

> Bu bosqich alohida rejalashtiriladi — lokal tarmoqdan internetga o'tish
> qo'shimcha xavfsizlik talablarini keltirib chiqaradi.

---

## Texnologik stek

- Backend: NestJS (TypeScript), PostgreSQL 18 (TypeORM), Redis 7
- Frontend: React + Vite, Tailwind CSS, Nginx orqali tarqatiladi
- Infratuzilma: Docker Compose
