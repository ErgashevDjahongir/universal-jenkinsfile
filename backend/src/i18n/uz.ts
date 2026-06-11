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
  subject: {
    notFound: 'Fan topilmadi',
    nameExists: 'Bunday nomli fan allaqachon mavjud',
  },
  category: {
    notFound: 'Kategoriya topilmadi',
    subjectMismatch: 'Ota-kategoriya boshqa fanga tegishli',
    selfParent: 'Kategoriya o‘ziga ota bo‘la olmaydi',
    cycle: 'Kategoriyalar ierarxiyasida halqa (cycle) hosil bo‘ladi',
  },
  question: {
    insufficientBank: 'Bankda yetarli savol yo‘q: {{detail}}',
    notFound: 'Savol topilmadi',
    archivedImmutable: 'Arxivlangan savolni tahrirlab bo‘lmaydi',
    expertForeignSubject: 'Siz bu fanga savol kirita olmaysiz',
    expertNotOwner: 'Faqat o‘zingiz yaratgan savolni tahrirlay olasiz',
    expertOnlyDraft: 'Ekspert faqat «qoralama» holatdagi savolni tahrirlaydi',
    approveOnlyDraft: 'Faqat «qoralama» holatdagi savol tasdiqlanadi',
    activateOnlyApproved: 'Faqat tasdiqlangan savol faollashtiriladi',
    invalidTransition: 'Holatni bunday o‘zgartirib bo‘lmaydi',
    optionsRequired: 'Bu savol turi uchun variantlar talab qilinadi',
    oneCorrectRequired: 'Aynan bitta to‘g‘ri variant bo‘lishi kerak',
    atLeastOneCorrect: 'Kamida bitta to‘g‘ri variant belgilanishi kerak',
    answerKeyRequired: 'Qisqa javob uchun answer_key (qabul variantlari) talab qilinadi',
    matchingPairsRequired: 'Moslashtirish uchun har variantda juftlik (match_pair) bo‘lishi kerak',
    attachmentType: 'Faqat png yoki jpg rasm yuklanadi',
    attachmentSize: 'Rasm hajmi 2 MB dan oshmasligi kerak',
  },
  common: {
    notFound: 'So‘ralgan ma’lumot topilmadi',
    forbidden: 'Bu amalni bajarishga ruxsatingiz yo‘q',
    validationFailed: 'Kiritilgan ma’lumotlar noto‘g‘ri',
  },
} as const;

export type Messages = typeof messages;
