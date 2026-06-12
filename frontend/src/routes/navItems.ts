import { UserRole } from '@/auth/roles';
import { uz } from '@/i18n/uz';

export interface NavItem {
  to: string;
  label: string;
  roles: UserRole[];
}

const ADMIN = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXPERT];

/** Admin paneli yon menyusi — har bir element kerakli rollar bilan. */
export const navItems: NavItem[] = [
  { to: '/dashboard', label: uz.nav.dashboard, roles: STAFF },
  { to: '/questions', label: uz.nav.questions, roles: STAFF },
  { to: '/templates', label: uz.nav.templates, roles: ADMIN },
  { to: '/assignments', label: uz.nav.assignments, roles: ADMIN },
  { to: '/sessions', label: uz.nav.sessions, roles: STAFF },
  { to: '/reports', label: uz.nav.reports, roles: STAFF },
  { to: '/users', label: uz.nav.users, roles: ADMIN },
  { to: '/departments', label: uz.nav.departments, roles: ADMIN },
];
