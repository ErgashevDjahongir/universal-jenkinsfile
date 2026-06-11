import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../config/data-source';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

/**
 * Boshlang'ich super-admin yaratadi (idempotent — login mavjud bo'lsa o'tkazib yuboradi).
 * Ishga tushirish: npm run seed:admin
 * Maxfiy so'z SEED_ADMIN_LOGIN / SEED_ADMIN_PASSWORD env'dan olinadi.
 */
async function seedAdmin(): Promise<void> {
  loadEnv();

  const login = process.env.SEED_ADMIN_LOGIN ?? 'superadmin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const cost = parseInt(process.env.BCRYPT_COST ?? '12', 10);

  // Parol kodga yozilmaydi — faqat .env'dan. Talab: kamida 8 belgi, harf + raqam (TZ §3).
  if (!password || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    throw new Error(
      'SEED_ADMIN_PASSWORD .env da bo‘lishi shart (kamida 8 belgi, harf va raqam bilan).',
    );
  }

  const dataSource = new DataSource({ ...dataSourceOptions, entities: [User] });
  await dataSource.initialize();

  try {
    const repo = dataSource.getRepository(User);
    const existing = await repo.findOne({ where: { login } });
    if (existing) {
      console.log(
        `Super-admin "${login}" allaqachon mavjud (id=${existing.id}). O'tkazib yuborildi.`,
      );
      return;
    }

    const user = repo.create({
      lastName: 'Super',
      firstName: 'Admin',
      login,
      passwordHash: await bcrypt.hash(password, cost),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    const saved = await repo.save(user);
    console.log(`Super-admin yaratildi: login="${login}", id=${saved.id}`);
    console.log('Parolni birinchi kirishdan keyin almashtiring.');
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((err) => {
  console.error('Seed xatosi:', err);
  process.exitCode = 1;
});
