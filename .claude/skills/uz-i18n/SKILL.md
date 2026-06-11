---
name: uz-i18n
description: E-TEST interfeysidagi o'zbekcha matnlar va tarjima kalitlari bilan ishlash tartibi. UI'ga ko'rinadigan har qanday matn, xato xabari yoki label qo'shishda HAR DOIM ishlatiladi.
---

# UI matnlari va i18n tartibi

## Asosiy qoida
Foydalanuvchiga ko'rinadigan biror matn JSX ichiga to'g'ridan-to'g'ri yozilmaydi.
Hammasi frontend/src/i18n/uz.ts da kalit bilan saqlanadi. Backend xato xabarlari
ham backend/src/i18n/uz.ts dan olinadi.

## Kalitlar tuzilmasi
Nuqta bilan ierarxiya: modul.kontekst.nom
common.save, common.cancel, auth.wrongPassword, test.timeLeft, result.passed.

## Yozuv uslubi (o'zbek lotin)
- Apostrof bitta xil: o'tdi, to'g'ri (aralashtirilmaydi)
- Tugmalar harakat fe'li bilan: Saqlash, Yuborish (OK emas)
- Xato xabarlari aybsiz ohangda va yechim bilan: "Parol kamida 8 belgidan
  iborat bo'lishi kerak" (Xato parol! emas)
- Sarlavhalar Sentence case: Savollar banki
- Rasmiy siz murojaati, to'liq so'zlar
- Sana: DD.MM.YYYY HH:mm. Raqam: minglik bo'sh joy (1 250), kasr vergul (4,5)

## O'zgaruvchili matnlar
Interpolatsiya: "Jami {count} ta savoldan {correct} tasiga to'g'ri javob berdingiz"

## Yangi matn qo'shish
1. uz.ts ga kalit qo'sh (mavjudini qidir, dublikat yaratma)
2. Komponentda t('...') orqali ishlat
3. Bitta tushuncha — bitta kalit (Saqlash 5 joyda kerak bo'lsa common.save)
