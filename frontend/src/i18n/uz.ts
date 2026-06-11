/**
 * UI matnlari — o'zbek tili (lotin). uz-i18n skiliga rioya qil.
 * Ko'p tillilik arxitekturasi uchun barcha matn shu yerdan o'qiladi;
 * komponentlarda qattiq yozilgan matn qoldirma.
 */
export const uz = {
  app: {
    name: 'E-TEST',
    tagline: 'Xodimlar va nomzodlarni baholash platformasi',
    backendStatus: 'Backend holati',
  },
  common: {
    loading: 'Yuklanmoqda…',
    connectionError: 'Serverga ulanib bo‘lmadi',
    error: 'Xatolik yuz berdi',
    retry: 'Qayta urinish',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    close: 'Yopish',
    confirm: 'Tasdiqlash',
    search: 'Qidirish',
    noData: 'Ma’lumot yo‘q',
    logout: 'Chiqish',
    comingSoon: 'Bu bo‘lim tez orada tayyor bo‘ladi.',
  },
  auth: {
    loginTitle: 'Tizimga kirish',
    loginSubtitle: 'Hisobingizga kirish uchun ma’lumotlarni kiriting',
    loginLabel: 'Login',
    loginPlaceholder: 'Login kiriting',
    passwordLabel: 'Parol',
    passwordPlaceholder: 'Parol kiriting',
    submit: 'Kirish',
    submitting: 'Kirilmoqda…',
    invalidCredentials: 'Login yoki parol noto‘g‘ri',
    sessionExpired: 'Sessiya muddati tugadi. Qayta kiring.',
    requiredLogin: 'Login kiritilishi shart',
    requiredPassword: 'Parol kiritilishi shart',
    welcome: 'Xush kelibsiz',
  },
  nav: {
    dashboard: 'Bosh sahifa',
    users: 'Foydalanuvchilar',
    questions: 'Savollar banki',
    templates: 'Test shablonlari',
    sessions: 'Sessiyalar',
    reports: 'Hisobotlar',
  },
  roles: {
    super_admin: 'Super-admin',
    admin: 'Administrator',
    expert: 'Ekspert',
    examinee: 'Test topshiruvchi',
  },
  errors: {
    forbiddenTitle: 'Ruxsat yo‘q',
    forbiddenText: 'Bu sahifani ko‘rishga huquqingiz yetarli emas.',
    notFoundTitle: 'Sahifa topilmadi',
    notFoundText: 'So‘ralgan sahifa mavjud emas.',
    backHome: 'Bosh sahifaga qaytish',
  },
  test: {
    home: 'Mening testlarim',
  },
} as const;
