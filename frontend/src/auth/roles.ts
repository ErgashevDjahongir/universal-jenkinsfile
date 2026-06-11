import { uz } from '@/i18n/uz';

/** Foydalanuvchi rollari — backend `user_role` enum bilan mos. */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EXPERT = 'expert',
  EXAMINEE = 'examinee',
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: uz.roles.super_admin,
  [UserRole.ADMIN]: uz.roles.admin,
  [UserRole.EXPERT]: uz.roles.expert,
  [UserRole.EXAMINEE]: uz.roles.examinee,
};

/** Rolning ko'rsatish uchun o'zbekcha nomini qaytaradi. */
export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role;
}
