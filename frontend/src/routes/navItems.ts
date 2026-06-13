import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart2,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Home,
  UserCheck,
  Users,
} from 'lucide-react';
import { UserRole } from '@/auth/roles';
import { uz } from '@/i18n/uz';

export interface NavItem {
  to: string;
  label: string;
  roles: UserRole[];
  icon: LucideIcon;
}

const ADMIN = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
// Ekspert faqat monitoring (sessiyalar) va hisobotlarni ko'radi — savollar banki yashirilgan.
const STAFF_WITH_EXPERT = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXPERT];

/** Admin paneli yon menyusi — har bir element kerakli rollar bilan. */
export const navItems: NavItem[] = [
  { to: '/dashboard', label: uz.nav.dashboard, roles: ADMIN, icon: Home },
  { to: '/questions', label: uz.nav.questions, roles: ADMIN, icon: BookOpen },
  { to: '/templates', label: uz.nav.templates, roles: ADMIN, icon: ClipboardList },
  { to: '/assignments', label: uz.nav.assignments, roles: ADMIN, icon: ClipboardCheck },
  { to: '/sessions', label: uz.nav.sessions, roles: STAFF_WITH_EXPERT, icon: Activity },
  { to: '/reports', label: uz.nav.reports, roles: STAFF_WITH_EXPERT, icon: BarChart2 },
  { to: '/candidates', label: uz.nav.candidates, roles: STAFF_WITH_EXPERT, icon: UserCheck },
  { to: '/users', label: uz.nav.users, roles: ADMIN, icon: Users },
  { to: '/departments', label: uz.nav.departments, roles: ADMIN, icon: Building2 },
];
