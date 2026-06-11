import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { RefreshTokenService } from './services/refresh-token.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    lastName: 'Test',
    firstName: 'User',
    middleName: null,
    login: 'tester',
    passwordHash: 'hashed',
    phone: null,
    email: null,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    departmentId: null,
    positionId: null,
    isCandidate: false,
    failedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService — blok logikasi', () => {
  let users: jest.Mocked<
    Pick<UsersService, 'findByLogin' | 'findById' | 'save' | 'registerFailedAttempt'>
  >;
  let passwords: jest.Mocked<Pick<PasswordService, 'compare' | 'compareDummy'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let refresh: jest.Mocked<Pick<RefreshTokenService, 'issue' | 'rotate' | 'revokeOwned'>>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByLogin: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      registerFailedAttempt: jest.fn(),
    };
    passwords = { compare: jest.fn(), compareDummy: jest.fn().mockResolvedValue(undefined) };
    jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    refresh = {
      issue: jest.fn().mockResolvedValue('refresh-token'),
      rotate: jest.fn(),
      revokeOwned: jest.fn(),
    };
    users.save.mockImplementation((u) => Promise.resolve(u));
    service = new AuthService(
      users as unknown as UsersService,
      passwords as unknown as PasswordService,
      jwt as unknown as JwtService,
      refresh as unknown as RefreshTokenService,
    );
  });

  it('noma’lum login uchun 401 va dummy bcrypt (timing tenglashtiriladi)', async () => {
    users.findByLogin.mockResolvedValue(null);
    await expect(service.login({ login: 'yoq', password: 'StrongPass1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // Enumeration himoyasi: topilmagan loginda ham bcrypt vaqti sarflanadi.
    expect(passwords.compareDummy).toHaveBeenCalledWith('StrongPass1');
  });

  it('bloklangan hisob (lockedUntil kelajakda) uchun 401', async () => {
    users.findByLogin.mockResolvedValue(makeUser({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expect(
      service.login({ login: 'tester', password: 'StrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.compare).not.toHaveBeenCalled();
  });

  it('noto‘g‘ri parol atomik registerFailedAttempt ni chaqiradi', async () => {
    const user = makeUser({ failedAttempts: 1 });
    users.findByLogin.mockResolvedValue(user);
    passwords.compare.mockResolvedValue(false);

    await expect(service.login({ login: 'tester', password: 'WrongPass9' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // Hisoblagichni oshirish va bloklash DB'da atomik bajariladi (konstantalar uzatiladi).
    expect(users.registerFailedAttempt).toHaveBeenCalledWith(
      user.id,
      AuthService.MAX_FAILED_ATTEMPTS,
      AuthService.LOCK_MINUTES,
    );
    // Eski read-modify-write save chaqirilmaydi.
    expect(users.save).not.toHaveBeenCalled();
  });

  it('to‘g‘ri parol hisoblagichni tiklaydi va token beradi', async () => {
    const user = makeUser({ failedAttempts: 3 });
    users.findByLogin.mockResolvedValue(user);
    passwords.compare.mockResolvedValue(true);

    const result = await service.login({ login: 'tester', password: 'StrongPass1' });
    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('1');
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ failedAttempts: 0, lockedUntil: null }),
    );
  });
});
