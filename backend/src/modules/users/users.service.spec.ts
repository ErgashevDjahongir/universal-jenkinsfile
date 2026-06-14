import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '42',
    lastName: 'Rahimov',
    firstName: 'Ali',
    middleName: null,
    login: 'ali',
    passwordHash: '$2b$12$abc',
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
    mustChangePassword: false,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepo(): jest.Mocked<Repository<User>> {
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as jest.Mocked<ReturnType<Repository<User>['createQueryBuilder']>>;

  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    _qb: qb,
  } as unknown as jest.Mocked<Repository<User>> & { _qb: typeof qb };
}

describe('UsersService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepo();
    service = new UsersService(repo as unknown as Repository<User>);
  });

  describe('findByIds', () => {
    it("bo'sh massiv berilganda find chaqirilmaydi", async () => {
      const result = await service.findByIds([]);
      expect(result).toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });

    it('idlar bo\'yicha find chaqiriladi', async () => {
      repo.find.mockResolvedValue([makeUser()]);
      const result = await service.findByIds(['42']);
      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('har doim isCandidate:false filtri bilan chaqiriladi', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll();
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isCandidate: false }) }),
      );
    });

    it('role filtri uzatilganda where ga qo\'shiladi', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll({ role: UserRole.EXPERT });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isCandidate: false, role: UserRole.EXPERT }),
        }),
      );
    });
  });

  describe('block', () => {
    it('topilmagan foydalanuvchi uchun NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.block('99')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allaqachon bloklangan foydalanuvchi uchun BadRequestException', async () => {
      repo.findOne.mockResolvedValue(makeUser({ status: UserStatus.BLOCKED }));
      await expect(service.block('42')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('aktiv foydalanuvchini bloklaydi', async () => {
      const user = makeUser({ status: UserStatus.ACTIVE });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({ ...user, status: UserStatus.BLOCKED });
      const result = await service.block('42');
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: UserStatus.BLOCKED }));
      expect(result.status).toBe(UserStatus.BLOCKED);
    });
  });

  describe('activate', () => {
    it('topilmagan foydalanuvchi uchun NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.activate('99')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('foydalanuvchini aktiv qiladi', async () => {
      const user = makeUser({ status: UserStatus.BLOCKED });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue({ ...user, status: UserStatus.ACTIVE });
      const result = await service.activate('42');
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('registerFailedAttempt', () => {
    it('QueryBuilder parametrized bindings bilan execute qiladi', async () => {
      const qb = (repo as unknown as { _qb: { setParameter: jest.Mock; execute: jest.Mock } })._qb;
      await service.registerFailedAttempt('42', 5, 15);
      expect(qb.setParameter).toHaveBeenCalledWith('max', 5);
      expect(qb.setParameter).toHaveBeenCalledWith('lock', 15);
      expect(qb.execute).toHaveBeenCalled();
    });

    it('maxAttempts va lockMinutes hech qachon SQL satriga qo\'shilmaydi (injection xavfsizligi)', async () => {
      const qb = (repo as unknown as { _qb: { set: jest.Mock; setParameter: jest.Mock } })._qb;
      await service.registerFailedAttempt('42', 999, 999);
      // .set() ga uzatilgan callback matn ichida raqam bo'lmasligi kerak
      const setCall = qb.set.mock.calls[0][0] as Record<string, () => string>;
      const failedSql: string = setCall['failedAttempts']();
      const lockedSql: string = setCall['lockedUntil']();
      expect(failedSql).not.toContain('999');
      expect(lockedSql).not.toContain('999');
      // Faqat placeholder ishlatiladi
      expect(failedSql).toContain(':max');
      expect(lockedSql).toContain(':max');
      expect(lockedSql).toContain(':lock');
    });
  });
});
