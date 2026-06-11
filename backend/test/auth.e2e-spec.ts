import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import { User } from '../src/modules/users/entities/user.entity';

/**
 * Auth + RBAC end-to-end. Haqiqiy Postgres + Redis talab qiladi
 * (docker compose up; bu mashinada DB_PORT=5433).
 */
describe('Auth (e2e)', () => {
  jest.setTimeout(30000); // app boot + DB/Redis ulanishi 5s default'dan uzunroq

  let app: INestApplication;
  let dataSource: DataSource;

  const LOGINS = ['e2e_admin', 'e2e_expert', 'e2e_lock'];

  async function seedUsers(): Promise<void> {
    const repo = dataSource.getRepository(User);
    await repo.delete({ login: LOGINS[0] });
    await repo.delete({ login: LOGINS[1] });
    await repo.delete({ login: LOGINS[2] });
    const hash = (p: string) => bcrypt.hash(p, 4);
    await repo.save([
      repo.create({
        lastName: 'E2E',
        firstName: 'Admin',
        login: 'e2e_admin',
        passwordHash: await hash('AdminPass1'),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
      repo.create({
        lastName: 'E2E',
        firstName: 'Expert',
        login: 'e2e_expert',
        passwordHash: await hash('ExpertPass1'),
        role: UserRole.EXPERT,
        status: UserStatus.ACTIVE,
      }),
      repo.create({
        lastName: 'E2E',
        firstName: 'Lock',
        login: 'e2e_lock',
        passwordHash: await hash('LockPass1'),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    ]);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    await seedUsers();
  }, 30000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const repo = dataSource.getRepository(User);
      for (const login of LOGINS) {
        await repo.delete({ login });
      }
    }
    await app?.close();
  });

  it('to‘g‘ri login → 200 va access token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'e2e_admin', password: 'AdminPass1' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.role).toBe(UserRole.ADMIN);
  });

  it('noto‘g‘ri parol → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'e2e_admin', password: 'WrongPass9' })
      .expect(401);
  });

  it('5 marta xato → keyingi urinishda bloklash xabari', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/api/auth/login')
        .send({ login: 'e2e_lock', password: 'WrongPass9' })
        .expect(401);
    }
    // Blokdan keyin to‘g‘ri parol ham 401 — "bloklangan" xabari bilan.
    const res = await request(server)
      .post('/api/auth/login')
      .send({ login: 'e2e_lock', password: 'LockPass1' })
      .expect(401);
    expect(String(res.body.message)).toContain('bloklangan');
  });

  it('token‘siz himoyalangan endpoint → 401', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('yetarli bo‘lmagan rol (expert → admin endpoint) → 403', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'e2e_expert', password: 'ExpertPass1' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('admin roli → /api/users 200 (ro‘yxat)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'e2e_admin', password: 'AdminPass1' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
