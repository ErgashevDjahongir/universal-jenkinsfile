# E-TEST — Texnik topshiriq (v1.0)

> Bu fayl Word'dagi rasmiy TZ'ning Claude Code o'qishi uchun Markdown nusxasi.
> Rasmiy hujjat: `docs/E-TEST_Texnik_topshiriq.docx`. Ma'lumotlar bazasi: `docs/schema.sql`.

## 1. Maqsad

Xodimlar va ishga qabul qilinayotgan nomzodlarning bilim darajasini test sinovi
orqali baholash web-platformasi. Vazifalar: baholashni avtomatlashtirish,
nomzodlarni saralash, natijalarni markazlashgan saqlash va tahlil, shaffoflik.

## 2. Rollar

| Rol | Vakolatlar |
|---|---|
| super_admin | To'liq boshqaruv: foydalanuvchilar, sozlamalar, audit, backup |
| admin (HR) | Savollar banki, test shablonlari, topshiruvchilar, sessiyalar, natijalar va eksport |
| expert | Faqat o'z fanlari bo'yicha savol kiritish/tahrirlash (tasdiqlash jarayoni bilan) |
| examinee | Testga kirish, topshirish, o'z natijasini ko'rish |

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
   *(Backlog, 2-bosqich: ekspert tomonidan qo'lda tekshirish rejimi.)*

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
