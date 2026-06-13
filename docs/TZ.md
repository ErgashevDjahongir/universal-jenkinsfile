# E-TEST — Texnik topshiriq (v1.0)

> Bu fayl Word'dagi rasmiy TZ'ning Claude Code o'qishi uchun Markdown nusxasi.
> Rasmiy hujjat: `docs/E-TEST_Texnik_topshiriq.docx`. Ma'lumotlar bazasi: `docs/schema.sql`.

## 1. Maqsad

Xodimlar va ishga qabul qilinayotgan nomzodlarning bilim darajasini test sinovi
orqali baholash web-platformasi. Vazifalar: baholashni avtomatlashtirish,
nomzodlarni saralash, natijalarni markazlashgan saqlash va tahlil, shaffoflik.

## 2. Rollar

| Rol         | Vakolatlar                                                                          |
| ----------- | ----------------------------------------------------------------------------------- |
| super_admin | To'liq boshqaruv: foydalanuvchilar, sozlamalar, audit, backup                       |
| admin (HR)  | Savollar banki, test shablonlari, topshiruvchilar, sessiyalar, natijalar va eksport |
| expert      | Faqat o'z fanlari bo'yicha savol kiritish/tahrirlash (tasdiqlash jarayoni bilan)    |
| examinee    | Testga kirish, topshirish, o'z natijasini ko'rish                                   |

## 3. Avtorizatsiya va identifikatsiya

- Admin/HR/ekspert: login + parol; parollar bcrypt/argon2 bilan xeshlanadi
- Parol: kamida 8 belgi, harf+raqam; 5 marta xato → 15 daqiqa bloklash
- Sessiya: 30 daqiqa harakatsizlikdan keyin avtomatik chiqish
- Topshiruvchi uchun ikki rejim:
  - (a) HR oldindan ro'yxatga oladi → login/parol yoki bir martalik kod/havola
  - (b) o'zini ro'yxatga olish: test oldidan F.I.Sh., lavozim/bo'lim
    (nomzodlarga telefon) kiritadi; majburiy maydonlarsiz test boshlanmaydi
- Bir martalik kod faqat bir marta ishlaydi; bitta hisobdan parallel ikki sessiya taqiqlanadi
- Har sessiyada IP va qurilma (user-agent) qayd etiladi

## 4. Administrator paneli

- Foydalanuvchilar CRUD, bloklash, arxivlash; Excel/CSV'dan ommaviy yuklash
- Bo'limlar va lavozimlar spravochniklari; topshiruvchilarni guruhlash
- Tayinlovlar: shablonni guruh/shaxsga biriktirish, faollik oynasi (boshlanish–tugash)
- Sessiyani majburan to'xtatish, bekor qilish, qayta topshirishga ruxsat
- Jonli monitoring: kim topshiryapti, qancha vaqt qoldi, qoidabuzarliklar
- Audit jurnali; sozlamalar (tashkilot nomi, logotip, standart o'tish bali); backup

## 5. Savollar banki

- Ierarxiya: fan → kategoriya (ierarxik) → savol; savolga bir nechta kategoriya (teg)
- Qiyinlik: easy / medium / hard
- Savol turlari: single_choice, multiple_choice, true_false, matching, ordering, short_answer
- Savolga rasm/jadval biriktirish (png/jpg, maks 2 MB); matn formatlash
- Excel/CSV import (xatolar hisoboti bilan) va eksport
- Holatlar: draft → approved → active → archived; arxivlangani yangi testga tushmaydi,
  eski natijalarda saqlanadi
- Versiyalar tarixi (kim, qachon, nima); dublikatlarni aniqlash
- Savol statistikasi: necha marta tushgan, to'g'ri yechilish foizi

### Ball belgilash

- Har savolga individual ball; berilmasa standart qiymat (sozlamada)
- Qiyinlikka ko'ra avtomatik taklif: easy=1, medium=2, hard=3 (sozlanadi)
- multiple_choice'da qisman baholash rejimi (proporsional)
- Jarima (manfiy) ball — shablon darajasida yoqiladi/o'chiriladi
- Shablonda ballni override qilish — bankdagi qiymat o'zgarmaydi

## 6. Test shablonlari

### Savol tanlash usullari

- Qo'lda (aniq ro'yxat), avtomatik (qoidalar bo'yicha tasodifiy), aralash
  (majburiy + avtomatik)

### Avtomatik tanlash qoidalari

- Jami savollar soni; kategoriya kesimida taqsimot (masalan 10+10+10);
  qiyinlik kesimida taqsimot (masalan 40/40/20%)
- Bankda yetarli savol bo'lmasa — saqlashdan oldin xato/ogohlantirish,
  qaysi kategoriya/daraja yetishmasligi ko'rsatiladi (jim davom etilmaydi)
- Har topshiruvchiga noyob to'plam; savollar VA variantlar tartibi aralashtiriladi
- Qayta topshirishda avvalgi urinish savollari imkon qadar takrorlanmaydi

### Shablon parametrlari

- Vaqt limiti (daqiqa, 1–600); o'tish bali (% yoki absolyut)
- Urinishlar soni va urinishlar orasidagi minimal interval
- Navigatsiya: erkin / faqat oldinga
- Natija ko'rsatish: darhol batafsil / darhol faqat ball / yashirin
- Jarima ball; baholash shkalasi: o'tdi/o'tmadi yoki a'lo/yaxshi/qoniqarli/qoniqarsiz
- Ruxsat etilgan tab almashtirishlar soni (oshsa avtoyakun)
- Sinov (preview) rejimi — natija statistikaga kirmaydi

## 7. Test topshirish jarayoni

- Kirish sahifasi: qoidalar, savollar soni, vaqt, o'tish bali → «Boshlash»
- Taymer doimiy ko'rinadi; vaqt SERVERDA nazorat qilinadi (started_at + limit),
  mijoz taymeri faqat ko'rsatish uchun; vaqt tugasa avtoyakun
- Savollar paneli: javob berilgan/berilmagan/belgilangan — rangli indikatsiya
- Har javob darhol serverda saqlanadi; uzilish/refresh'da sessiya qoldiq vaqt
  bilan tiklanadi (aralashtirilgan tartib o'zgarmaydi)
- Halollik: tab/oyna almashtirish aniqlanadi → ogohlantirish → limitdan oshsa
  avtoyakun (sozlanadi); nusxalash va o'ng tugma bloklanadi
- TO'G'RI JAVOBLAR MIJOZGA UZATILMAYDI — tekshiruv faqat serverda
- Yakunlangach javoblar o'zgarmas (immutable)

## 8. Natijalar va hisobotlar

- Individual: ball, foiz, o'tdi/o'tmadi, sarflangan vaqt, kategoriya kesimida tahlil
- Admin ko'rinishi: har savol, berilgan va to'g'ri javob
- PDF bayonnoma/sertifikat (F.I.Sh., sana, ball, QR orqali haqiqiylik tekshiruvi)
- Umumiy: bo'lim/guruh/sana/fan filtrlash, reyting, Excel/PDF eksport
- Eng ko'p xato qilinadigan savollar tahlili; xodim natijalari dinamikasi

## 9. Funksional bo'lmagan talablar

- Til: o'zbek (lotin); ko'p tillilik arxitekturasi (i18n)
- Responsive: kompyuter/planshet/telefon; Chrome, Edge, Firefox, Safari
- Unumdorlik: 200+ parallel topshiruvchi; sahifa yuklanishi ≤ 2 s
- Xavfsizlik: HTTPS, parol xeshlash, SQLi/XSS/CSRF himoya, RBAC, audit
- Shaxsiy ma'lumotlar: O'zR «Shaxsga doir ma'lumotlar to'g'risida»gi qonunga
  muvofiqlik, mahalliy serverlarda saqlash
- Ishonchlilik: kunlik backup; 99%+ uzluksizlik (sessiyalar davrida)
- Integratsiya: REST API (Swagger/OpenAPI hujjatlari bilan)

## 10. Bosqichlar

1. Tahlil/dizayn: maketlar, DB sxema, API spetsifikatsiya (2–3 hafta)
2. MVP: auth, savollar banki, oddiy test tuzish/topshirish, natijalar (4–6 hafta)
3. Kengaytirish: avtomatik tanlash, ball tizimi, hisobotlar, import/eksport (3–4 hafta)
4. Testlash, xavfsizlik auditi, yuklama testi (2 hafta)
5. Joriy etish, o'qitish, hujjatlar (1–2 hafta)

## 11. Aniqlashtirilgan qarorlar (v1.0)

Quyidagi qarorlar ishlab chiqish bosqichida tasdiqlandi va ziddiyatli/noaniq
joylarni hal qiladi. Ziddiyat bo'lsa, bu bo'lim ustun.

1. **PostgreSQL versiyasi — 18.** `schema.sql` dagi eski "16" izohi 18 ga
   tuzatildi.

2. **Parol xeshlash — faqat bcrypt, cost 12.** argon2 ishlatilmaydi
   (TZ §3 dagi "bcrypt/argon2" o'rniga). `CLAUDE.md` ustun.

3. **Sinov (preview) rejimi.** `test_sessions.is_preview BOOLEAN NOT NULL
DEFAULT FALSE` ustuni qo'shildi. `is_preview = TRUE` sessiyalar:
   - `questions.times_used` / `times_correct` statistikasiga kirmaydi;
   - umumiy hisobotlarda ko'rinmaydi;
   - `max_attempts` urinishlar limitida hisoblanmaydi;
   - faqat `admin` / `super_admin` ocha oladi.

4. **PDF bayonnoma QR verifikatsiyasi.** `test_sessions.certificate_uid UUID
UNIQUE` ustuni qo'shildi; sessiya muvaffaqiyatli yakunlanganda generatsiya
   qilinadi (preview va o'tmagan sessiyalarda emas). Ommaviy endpoint:
   `GET /verify/:uid` — auth'siz, rate-limit bilan, faqat minimal ma'lumot
   qaytaradi: F.I.Sh., test nomi, sana, ball, o'tdi/o'tmadi. Topilmasa 404.
   Alohida jadval kerak emas.

5. **`short_answer` baholash (MVP).** Faqat avtomatik. `questions.answer_key` —
   vergul bilan ajratilgan QABUL QILINADIGAN VARIANTLAR ro'yxati.
   Normalizatsiya: `trim` + `lowercase` + ketma-ket bo'shliqlarni bittaga
   tushirish (ikkala tomonda ham). Javob variantlardan BITTASIGA to'liq mos
   kelsa — to'g'ri (to'liq ball); aks holda 0. Qisman ball yo'q.
   _(Backlog, 2-bosqich: ekspert tomonidan qo'lda tekshirish rejimi.)_

6. **O'zini ro'yxatga olish oqimi (TZ §3b).** (1) topshiruvchi kod + F.I.Sh. +
   telefon yuboradi → (2) `users` da `role = examinee`, `login = NULL` yozuv
   yaratiladi → (3) `access_codes.user_id` va `used_at` to'ldiriladi →
   (4) sessiya ochiladi. Agar kodga oldindan user biriktirilgan bo'lsa, yangi
   user yaratilmaydi va F.I.Sh. so'ralmaydi.

7. **Jarima va qisman ball.**
   - `negative_points` faqat savol TO'LIQ noto'g'ri bo'lganda qo'llanadi;
     qisman ball olgan savolga jarima yo'q.
   - Savol darajasida `awarded_points` manfiy bo'lishi mumkin
     (`−negative_points`).
   - Sessiya JAMI bali 0 dan pastga tushmaydi: `score = max(yig'indi, 0)`.
   - `percent = score / max_score * 100`; o'tish shu `percent` bo'yicha
     aniqlanadi.

8. **`avoid_repeat_questions` — yumshoq talab.** Avtomatik tanlashda avval
   avvalgi urinish savollari chiqarib tashlanadi; yetishmay qolsa, kamomad
   takror savollar bilan to'ldiriladi va sessiya ochiladi (xato qaytarilmaydi).
   Qattiq "xato qaytar" qoidasi faqat bankda umuman yetarli faol savol yo'q
   holatga tegishli.

9. **Parallel sessiya taqiqi — DB darajasida** (Redis lock emas):
   `CREATE UNIQUE INDEX uq_sessions_one_in_progress ON test_sessions (user_id)
WHERE status = 'in_progress';`. Insert paytidagi unique buzilishi ilovada
   `409 Conflict` + tushunarli o'zbekcha xabarga aylantiriladi.

---

## Test topshiruvchilar workflow

> Manba: `docs/E-TEST_Topshiruvchilar_workflow_reja.docx` (v1.0, 2026-06-13)

### Asosiy qarorlar

| №   | Mavzu                   | Qaror                                                                                                                                         |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Toifa ajratish          | Test topshiruvchilar xodimlardan (`users`) **alohida jadvalda** (`candidates`) saqlanadi; login bilan kirmaydi, faqat bir martalik kod orqali |
| 2   | Kim kiritadi            | Administrator test topshiruvchini oldindan kiritadi: F.I.Sh., telefon va 3 ta PDF hujjat                                                      |
| 3   | Hujjatlar               | Tavsiyanoma, ma'lumotnoma, ariza — har biri PDF; administrator yuklaydi                                                                       |
| 4   | Tayinlov soni           | Bitta test topshiruvchiga bitta tayinlov                                                                                                      |
| 5   | Ro'yxatda ko'rinish     | Tayinlov biriktirilgandan so'ng ro'yxatda paydo bo'ladi                                                                                       |
| 6   | Kim ko'radi             | Administrator va ekspert ro'yxatni ko'radi; ekspert barcha topshiruvchilarni ko'radi (fan bo'yicha cheklov yo'q)                              |
| 7   | Ekspert huquqi          | Ekspert faqat **read-only**: ko'rish, yuklab olish; hech narsa kiritish/o'zgartirish/o'chirish taqiqlanadi                                    |
| 8   | Holat oqimi             | `pending → in_progress → completed / no_show`; tugash vaqti o'tganda avtomatik                                                                |
| 9   | Ma'lumot saqlanishi     | Yakunlangandan keyin ham hujjat va ma'lumotlar saqlanadi (o'chirilmaydi)                                                                      |
| 10  | Kod bilan kirish        | Topshiruvchi kod bilan kirganda avtomatik ro'yxatdan topiladi — F.I.Sh. qo'lda kiritiImaydi                                                   |
| 11  | Tayinlovni o'zgartirish | Faqat **boshlanmagan** tayinlov tahrirlanadi (vaqt, shablon, nom)                                                                             |
| 12  | Terminologiya           | UI'da "Fan" → "Yo'nalish" (faqat ko'rinadigan matn; kodda `subject` qoladi)                                                                   |

### Ma'lumotlar bazasi o'zgarishlari

**Yangi jadval: `candidates`**

| Ustun      | Turi          | Izoh                                                |
| ---------- | ------------- | --------------------------------------------------- |
| id         | UUID/serial   | Birlamchi kalit                                     |
| full_name  | VARCHAR       | F.I.Sh. (majburiy)                                  |
| phone      | VARCHAR       | Telefon (majburiy)                                  |
| status     | ENUM          | `pending` / `in_progress` / `completed` / `no_show` |
| created_by | FK → users.id | Kiritgan administrator                              |
| created_at | TIMESTAMP     | —                                                   |
| updated_at | TIMESTAMP     | —                                                   |

**Yangi jadval: `candidate_documents`**

| Ustun         | Turi               | Izoh                                           |
| ------------- | ------------------ | ---------------------------------------------- |
| id            | UUID/serial        | Birlamchi kalit                                |
| candidate_id  | FK → candidates.id | Qaysi topshiruvchiga tegishli                  |
| doc_type      | ENUM               | `recommendation` / `reference` / `application` |
| file_path     | VARCHAR            | Saqlangan fayl yo'li                           |
| original_name | VARCHAR            | Asl fayl nomi                                  |
| file_size     | INT                | Fayl hajmi (bayt)                              |
| uploaded_by   | FK → users.id      | Yuklagan administrator                         |
| uploaded_at   | TIMESTAMP          | —                                              |

**Mavjud jadvallarga qo'shimcha**

- `test_assignments`: `candidate_id` (FK → candidates.id) — tayinlov candidatega bog'lanadi (mavjud user bog'lanishi saqlanadi)
- `access_codes`: `candidate_id` bog'lanishi — kod candidatega beriladi
- `test_sessions`: `candidate_id` (FK) — sessiya qaysi topshiruvchiga tegishli

Barcha yangi ustunlar NULL bo'lishiga ruxsat beriladi (orqaga moslik).

### Holat oqimi

| Holat         | Qachon                                           | Ko'rinish                        |
| ------------- | ------------------------------------------------ | -------------------------------- |
| `pending`     | Tayinlov biriktirilgan, topshiruvchi boshlamagan | Joriy ro'yxat                    |
| `in_progress` | Topshiruvchi kod bilan kirib testni boshlagan    | Joriy ro'yxat + jonli monitoring |
| `completed`   | Topshiruvchi testni yakunlagan                   | Natijalar                        |
| `no_show`     | Tugash vaqti o'tdi, topshiruvchi kirmagan        | Natijalar                        |

### Rollar va ruxsatlar

**Administrator:**

- Topshiruvchi qo'shish/tahrirlash, PDF hujjat yuklash
- Tayinlov biriktirish (shablon + vaqt oralig'i), bir martalik kod generatsiyasi
- Boshlanmagan tayinlovni tahrirlash

**Ekspert (faqat ko'rish):**

- Topshiruvchilar ro'yxati va kartochkasini ko'rish, hujjatlarni yuklab olish
- Jonli monitoring, natijalar va hisobotlarni ko'rish
- Hech qanday POST/PATCH/DELETE amali yo'q — server tomonida guard bilan ta'minlanadi

**Test topshiruvchi (kod bilan kirish):**

- Bir martalik kod kiritadi → avtomatik topshiruvchi aniqlanadi
- Test boshlash → topshirish → natijani ko'rish (mavjud jarayon)

### Xavfsizlik talablari

- PDF hujjat fayllari himoyalangan; faqat autentifikatsiyadan o'tgan admin/ekspert kira oladi — ommaviy URL yo'q
- Fayl tekshiruvi: faqat PDF (MIME + kengaytma), maksimal hajm cheklovi, fayl qayta nomlanadi (asl nom `original_name`da saqlanadi)
- Ekspert uchun barcha yozish endpointlari (POST/PATCH/DELETE candidates/documents/assignments) server tomonida taqiqlanadi
- Topshiruvchining shaxsiy ma'lumotlari boshqa topshiruvchilarga ko'rinmaydi
- Kod bilan kirishda faqat o'sha topshiruvchining sessiyasi ochiladi
- Barcha o'zgartiruvchi amallar (qo'shish, yuklash, tayinlash) audit jurnaliga yoziladi

### Amalga oshirish bosqichlari

| Bosqich | Mazmun                                                                               |
| ------- | ------------------------------------------------------------------------------------ |
| A       | Terminologiya: UI'da "Fan" → "Yo'nalish" (faqat `uz.ts`)                             |
| B       | DB: `candidates`, `candidate_documents` jadvallari + FK + migratsiya                 |
| C       | Backend: candidates moduli (CRUD), hujjat yuklash, tayinlov, holat oqimi, kod-kirish |
| D       | Admin frontend: ro'yxat, qo'shish/tahrirlash, hujjat yuklash, tayinlash, kartochka   |
| E       | Ekspert frontend: ro'yxat va kartochka (read-only)                                   |
| F       | Kod-kirish frontend: avtomatik topshiruvchi aniqlash                                 |
| G       | Yakuniy: holat avtomatik o'tishi (tugash vaqti), xavfsizlik audit, sinov             |
