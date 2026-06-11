import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export const ROLES_KEY = 'roles';

/** Endpoint'ga ruxsat etilgan rollarni belgilaydi; RolesGuard tekshiradi. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
