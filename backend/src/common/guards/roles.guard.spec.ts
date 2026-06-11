import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../../modules/auth/types/auth-user.interface';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: AuthUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const admin: AuthUser = {
  id: '1',
  login: 'a',
  role: UserRole.ADMIN,
  firstName: 'A',
  lastName: 'B',
};

describe('RolesGuard', () => {
  it('rollar belgilanmagan bo‘lsa ruxsat beradi', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
  });

  it('foydalanuvchi roli mos kelsa ruxsat beradi', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser(admin))).toBe(true);
  });

  it('rol mos kelmasa ForbiddenException tashlaydi', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.SUPER_ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser(admin))).toThrow(ForbiddenException);
  });

  it('foydalanuvchi yo‘q bo‘lsa ForbiddenException tashlaydi', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.ADMIN],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
