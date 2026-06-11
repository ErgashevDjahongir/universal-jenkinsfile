# CLAUDE.md — E-TEST loyihasi

Bu fayl Claude Code uchun loyiha konteksti va qoidalarini belgilaydi.
Loyihaning to'liq talablari `docs/TZ.md` faylida (rasmiy Word nusxasi:
`docs/E-TEST_Texnik_topshiriq.docx`), ma'lumotlar bazasi sxemasi `docs/schema.sql` faylida.
Biror funksiya qanday ishlashi noaniq bo'lsa, AVVAL docs/TZ.md ga qara.

## Loyiha haqida

**E-TEST** — xodimlar va ishga qabul qilinayotgan nomzodlarni test sinovidan
o'tkazish web-platformasi. Asosiy modullar:

- Avtorizatsiya va rollar (RBAC): super-admin, admin (HR), ekspert, test topshiruvchi
- Savollar banki: fan → kategoriya → savol ierarxiyasi, 6 xil savol turi,
  qiyinlik darajalari (oson/o'rta/qiyin), har bir savolga individual ball
- Test shablonlari: savollarni qo'lda yoki avtomatik (tasodifiy) tanlash —
  kategoriya va qiyinlik bo'yicha taqsimot qoidalari bilan
- Test sessiyalari: taymer, javoblarni serverda darhol saqlash, halollik
  nazorati (tab almashtirishni aniqlash, nusxalashni bloklash)
- Natijalar va hisobotlar: individual natija, PDF bayonnoma, Excel eksport

## Texnologik stek

- **Backend:** NestJS (TypeScript), REST API, Swagger/OpenAPI
- **Frontend:** React + Vite (TypeScript), Tailwind CSS
- **Ma'lumotlar bazasi:** PostgreSQL 18, TypeORM migratsiyalari
- **Kesh/sessiya:** Redis
- **Infratuzilma:** Docker Compose (dev), Nginx (prod)

## Skillar va agentlar

Loyihada quyidagi skillar bor — tegishli ish boshlashdan OLDIN o'qib chiq:

- `.claude/skills/api-endpoint/` — yangi REST endpoint qo'shish tartibi
- `.claude/skills/db-migration/` — sxema o'zgartirish va migratsiya qoidalari
- `.claude/skills/frontend-style/` — Tailwind dizayn tizimi (UI yozishda majburiy)
- `.claude/skills/uz-i18n/` — UI matnlari va o'zbekcha yozuv uslubi

Yirik o'zgarish yakunlangach yoki commit oldidan `code-reviewer` agentini
ishga tushir — u xavfsizlik ro'yxati bo'yicha tekshiradi.

## Loyiha tuzilmasi

```
backend/
  src/
    modules/          # har bir modul: auth, users, questions, tests, sessions, reports
      <module>/
        <module>.controller.ts
        <module>.service.ts
        <module>.module.ts
        dto/
        entities/
    common/           # guards, interceptors, filters, decorators
    config/
    migrations/
    i18n/             # backend xato xabarlari (uz.ts)
  test/               # e2e testlar
frontend/
  src/
    pages/            # sahifalar (admin, test-taking, results)
    components/
      ui/             # umumiy UI komponentlar (Button, Input, Card...)
    api/              # backendga so'rovlar (axios client)
    hooks/
    i18n/             # UI matnlari (uz.ts)
docs/                 # TZ, schema.sql va boshqa hujjatlar
docker-compose.yml
```

## Buyruqlar

```bash
# Backend
cd backend && npm run start:dev      # dev server (port 3000)
cd backend && npm run test           # unit testlar
cd backend && npm run test:e2e       # e2e testlar
cd backend && npm run lint           # ESLint
cd backend && npm run migration:run  # migratsiyalarni qo'llash

# Frontend
cd frontend && npm run dev           # dev server (port 5173)
cd frontend && npm run build
cd frontend && npm run lint

# Infratuzilma
docker compose up -d                 # PostgreSQL 18 + Redis
```

## Kod yozish qoidalari

- Til: barcha kod, o'zgaruvchi va funksiya nomlari **ingliz tilida**;
  UI matnlari va xato xabarlari **o'zbek tilida (lotin)** — uz-i18n skilliga qara
- TypeScript `strict: true`; `any` ishlatma
- Har bir endpoint uchun DTO + `class-validator` validatsiyasi majburiy
- Swagger dekoratorlari (`@ApiOperation`, `@ApiResponse`) har bir controllerda bo'lsin
- UI faqat Tailwind utility klasslari bilan — frontend-style skilliga qara
- DB jadval va ustun nomlari: `snake_case`; entity klasslari: `PascalCase`
- Commit xabarlari: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Yangi funksiya qo'shganda unit test ham yoz; ball hisoblash va savol tanlash
  logikasi testsiz commit qilinmaydi

## Xavfsizlik qoidalari (MUHIM)

- **To'g'ri javoblar hech qachon frontendga yuborilmaydi.** Savolni topshiruvchiga
  qaytaradigan DTOlarda `isCorrect` maydoni bo'lmasin; tekshiruv faqat serverda
- Parollar faqat bcrypt (cost ≥ 10) bilan xeshlanadi
- Barcha admin endpointlari `JwtAuthGuard` + `RolesGuard` bilan himoyalanadi
- Topshiruvchi faqat o'ziga biriktirilgan sessiyaga kira oladi (ownership check)
- Raw SQL yozma — faqat TypeORM query builder/repository; foydalanuvchi
  kiritgan ma'lumot hech qachon so'rovga to'g'ridan-to'g'ri qo'shilmaydi
- Fayl yuklash (savol rasmlari): faqat png/jpg, maks. 2 MB, nomini qayta nomlash
- `.env` fayllar hech qachon commit qilinmaydi

## Domen qoidalari (biznes-logika)

- Savol holatlari: `draft → approved → active → archived`; arxivlangan savol
  yangi testlarga tushmaydi, eski natijalarda saqlanadi
- Avtomatik tanlashda bankda yetarli savol bo'lmasa — xato qaytar, jim davom etma
- Har bir topshiruvchiga savollar va variantlar tartibi alohida aralashtiriladi;
  aralashtirilgan tartib sessiyada saqlanadi (sahifa yangilansa o'zgarmasin)
- Ball hisoblash: savolning individual bali; ko'p javobli savollarda qisman
  baholash; jarima ball — test shabloni sozlamasiga qarab
- Vaqt serverda hisoblanadi (sessiya `started_at` + limit); mijoz taymeri
  faqat ko'rsatish uchun
- Test yakunlangach javoblarni o'zgartirib bo'lmaydi (immutable)

## Ishlash uslubi

- Katta o'zgarishdan oldin qisqa reja taqdim et, tasdiqdan keyin boshla
- Mavjud modullar uslubiga rioya qil — yangi pattern kiritishdan oldin so'ra
- Migratsiya fayllarini qo'lda tahrirlash o'rniga yangi migratsiya yarat
- Tushunarsiz talab bo'lsa, taxmin qilmasdan savol ber
