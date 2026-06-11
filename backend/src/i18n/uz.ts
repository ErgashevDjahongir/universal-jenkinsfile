/**
 * Backend xato xabarlari — o'zbek tili (lotin).
 * UI matnlari frontend/src/i18n da; bu fayl faqat server javoblari uchun.
 * Yangi xabar qo'shganda kalitni `domain.action` ko'rinishida nomla.
 */
export const messages = {
  auth: {
    invalidCredentials: 'Login yoki parol noto‘g‘ri',
    accountLocked: 'Hisob vaqtincha bloklangan. Keyinroq urinib ko‘ring',
    sessionExpired: 'Sessiya muddati tugagan. Qaytadan kiring',
  },
  session: {
    alreadyInProgress: 'Sizda allaqachon faol test sessiyasi mavjud',
    notOwner: 'Bu sessiyaga kirishga ruxsatingiz yo‘q',
    finishedImmutable: 'Yakunlangan sessiya javoblarini o‘zgartirib bo‘lmaydi',
  },
  question: {
    insufficientBank: 'Bankda yetarli savol yo‘q: {{detail}}',
  },
  common: {
    notFound: 'So‘ralgan ma’lumot topilmadi',
    forbidden: 'Bu amalni bajarishga ruxsatingiz yo‘q',
    validationFailed: 'Kiritilgan ma’lumotlar noto‘g‘ri',
  },
} as const;

export type Messages = typeof messages;
