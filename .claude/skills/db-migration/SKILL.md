---
name: db-migration
description: E-TEST ma'lumotlar bazasi sxemasini o'zgartirish va TypeORM migratsiya yaratish qoidalari. Entity, jadval, ustun, indeks o'zgarganda HAR DOIM ishlatiladi.
---

# Migratsiyalar (TypeORM, PostgreSQL 18)

## Asosiy qoidalar
1. Ishga tushirilgan migratsiya HECH QACHON tahrirlanmaydi — tuzatuvchi yangi yoz.
2. synchronize: false (developmentda ham).
3. Har migratsiyada up() va ishlaydigan down().
4. Sxema manbai docs/schema.sql — entity o'zgarsa, schema.sql ham yangilanadi.

## Ish tartibi
1. Entity o'zgartir
2. npm run migration:generate src/migrations/NomiAniqVaQisqa
3. Faylni ko'zdan kechir — TypeORM DROP+ADD qilmasin (ma'lumot yo'qoladi)
4. migration:run bilan sina
5. migration:revert bilan down() tekshir, qayta run

## Nomlash
Fe'l+Obyekt: AddGradeColumnToSessions, CreateAccessCodesTable.

## Xavfli amallar
- Ustun o'chirish/nom o'zgartirish: ikki bosqichli migratsiya
- NOT NULL qo'shish: avval qiymat ber, keyin constraint
- ENUM'ga qiymat: ALTER TYPE ... ADD VALUE (o'chirib bo'lmaydi)
- Katta jadvalga indeks: CREATE INDEX CONCURRENTLY

## Taqiqlar
Migratsiyada ilova logikasini import qilish; bir migratsiyada bog'liq bo'lmagan
o'zgarishlar; production'da qo'lda SQL.
