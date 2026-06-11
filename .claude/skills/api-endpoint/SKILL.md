---
name: api-endpoint
description: E-TEST backend'ida yangi REST endpoint qo'shish tartibi. Controller, service, DTO yoki yangi API marshrut yaratishda HAR DOIM ishlatiladi.
---

# Yangi API endpoint qo'shish tartibi (6 qadam)

## 1. DTO + validatsiya
dto/ ichida, har maydon class-validator bilan. Response uchun alohida DTO.
Topshiruvchiga qaytadigan DTOlarda isCorrect maydoni BO'LMASLIGI SHART.

## 2. Service — biznes-logika
Controller'da logika yo'q, faqat service. Repository orqali (raw SQL taqiqlanadi).
NotFoundException/ForbiddenException. Ownership: topshiruvchi faqat o'z sessiyasiga.

## 3. Controller — marshrut va himoya
@UseGuards(JwtAuthGuard, RolesGuard) + @Roles(...). Guard'siz faqat: login,
kirish kodi bilan testga kirish, health-check.

## 4. Swagger
@ApiOperation, @ApiResponse (muvaffaqiyat + xatolar), @ApiProperty — to'ldiriladi.

## 5. Audit
POST/PATCH/DELETE da AuditService.log() — action nomi entity.amal formatida.

## 6. Test
Service unit test (asosiy + xato holatlari). Controller e2e: ruxsatsiz so'rov
401/403. Ball hisoblash/savol tanlashga tegsa — chegaraviy testlar.

## Nomlash
Marshrutlar ko'plik kebab-case: /test-templates, /sessions/:id/answers.
GET ro'yxat/bitta, POST yaratish, PATCH yangilash, DELETE (arxivlash afzal).
