import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { UserStatus } from '../../common/enums/user-status.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_COST ?? '12', 10);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByLogin(login: string): Promise<User | null> {
    return this.users.findOne({ where: { login } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.users.find({ where: { id: In(ids) } });
  }

  findAll(filter?: UserFilterDto): Promise<User[]> {
    // Kod orqali kirgan topshiruvchilar uchun avtomatik yaratilgan examinee'lar
    // (is_candidate=true) xodimlar ro'yxatida ko'rinmaydi — bular candidate dublikatlari.
    const where: Record<string, unknown> = { isCandidate: false };
    if (filter?.role) where['role'] = filter.role;
    if (filter?.status) where['status'] = filter.status;
    if (filter?.departmentId) where['departmentId'] = filter.departmentId;
    return this.users.find({ where, order: { lastName: 'ASC', firstName: 'ASC' } });
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }

  async create(dto: CreateUserDto, createdBy?: string): Promise<User> {
    const user = this.users.create({
      lastName: dto.lastName,
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      login: dto.login ?? null,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS) : null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      role: dto.role,
      departmentId: dto.departmentId ?? null,
      positionId: dto.positionId ?? null,
      isCandidate: dto.isCandidate ?? false,
      createdBy: createdBy ?? null,
    });
    return this.users.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName ?? null;
    if (dto.login !== undefined) user.login = dto.login ?? null;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;
    if (dto.email !== undefined) user.email = dto.email ?? null;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.departmentId !== undefined) user.departmentId = dto.departmentId ?? null;
    if (dto.positionId !== undefined) user.positionId = dto.positionId ?? null;
    if (dto.isCandidate !== undefined) user.isCandidate = dto.isCandidate;
    return this.users.save(user);
  }

  async block(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.status === UserStatus.BLOCKED) {
      throw new BadRequestException('Foydalanuvchi allaqachon bloklangan');
    }
    user.status = UserStatus.BLOCKED;
    return this.users.save(user);
  }

  async activate(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    user.status = UserStatus.ACTIVE;
    return this.users.save(user);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.update({ id: userId }, { passwordHash: hash, mustChangePassword: false });
  }

  async registerFailedAttempt(
    userId: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<void> {
    // Parametrized bindings: maxAttempts va lockMinutes hech qachon SQL fragmentiga
    // to'g'ridan-to'g'ri qo'shilmaydi — injection xavfi yo'q.
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        failedAttempts: () =>
          'CASE WHEN failed_attempts + 1 >= :max THEN 0 ELSE failed_attempts + 1 END',
        lockedUntil: () =>
          'CASE WHEN failed_attempts + 1 >= :max ' +
          "THEN now() + (interval '1 minute' * :lock) ELSE locked_until END",
      })
      .setParameter('max', maxAttempts)
      .setParameter('lock', lockMinutes)
      .where('id = :userId', { userId })
      .execute();
  }
}
