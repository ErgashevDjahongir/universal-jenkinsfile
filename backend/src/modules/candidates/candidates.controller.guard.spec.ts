import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { CandidatesController } from './candidates.controller';

/**
 * Ekspert candidates ga nisbatan READ-ONLY (CLAUDE.md xavfsizlik qoidasi).
 * Bu test haqiqiy @Roles metadata'sini RolesGuard orqali tekshiradi —
 * frontenda yashirish emas, server tomonida ta'minlanishini kafolatlaydi.
 */
const expert: AuthUser = {
  id: '2',
  login: 'expert',
  role: UserRole.EXPERT,
  firstName: 'E',
  lastName: 'X',
  mustChangePassword: false,
};

const guard = new RolesGuard(new Reflector());

function ctxFor(methodName: keyof CandidatesController, user: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => CandidatesController.prototype[methodName],
    getClass: () => CandidatesController,
  } as unknown as ExecutionContext;
}

describe('CandidatesController — ekspert read-only (server guard)', () => {
  const writeMethods: (keyof CandidatesController)[] = [
    'create',
    'update',
    'remove',
    'uploadDocument',
    'removeDocument',
    'assign',
    'updateAssignment',
  ];
  it.each(writeMethods)('ekspert «%s» yozish amalida 403 oladi', (method) => {
    expect(() => guard.canActivate(ctxFor(method, expert))).toThrow(ForbiddenException);
  });

  const readMethods: (keyof CandidatesController)[] = ['findAll', 'findOne', 'downloadDocument'];
  it.each(readMethods)('ekspert «%s» ko‘rish amaliga ruxsat oladi', (method) => {
    expect(guard.canActivate(ctxFor(method, expert))).toBe(true);
  });
});
