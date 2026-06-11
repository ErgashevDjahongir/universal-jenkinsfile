import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';

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

  /** Berilgan id-lar bo'yicha mavjud foydalanuvchilarni qaytaradi (tartib kafolatlanmaydi). */
  findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.users.find({ where: { id: In(ids) } });
  }

  findAll(): Promise<User[]> {
    return this.users.find({ order: { id: 'ASC' } });
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }

  /**
   * Noto'g'ri parol urinishini ATOMIK qayd etadi: bitta UPDATE bilan hisoblagichni
   * oshiradi va chegaraga yetganda hisobni bloklaydi. Konkurent urinishlar
   * yo'qotilmaydi (read-modify-write poyga muammosini hal qiladi).
   * maxAttempts/lockMinutes — kod konstantalari (foydalanuvchi kiritmaydi).
   */
  async registerFailedAttempt(
    userId: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<void> {
    await this.users
      .createQueryBuilder()
      .update(User)
      .set({
        failedAttempts: () =>
          `CASE WHEN failed_attempts + 1 >= ${maxAttempts} THEN 0 ELSE failed_attempts + 1 END`,
        lockedUntil: () =>
          `CASE WHEN failed_attempts + 1 >= ${maxAttempts} ` +
          `THEN now() + (interval '1 minute' * ${lockMinutes}) ELSE locked_until END`,
      })
      .where('id = :userId', { userId })
      .execute();
  }
}
