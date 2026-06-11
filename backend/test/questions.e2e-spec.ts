import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import { QuestionType } from '../src/common/enums/question-type.enum';
import { User } from '../src/modules/users/entities/user.entity';
import { Subject } from '../src/modules/subjects/entities/subject.entity';
import { Question } from '../src/modules/questions/entities/question.entity';
import { ExpertSubject } from '../src/modules/subjects/entities/expert-subject.entity';

/** Savollar banki + RBAC end-to-end (haqiqiy Postgres + Redis; DB_PORT=5433). */
describe('Questions (e2e)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let expertToken: string;
  let expertId: string;
  let subjectA: string; // ekspertga biriktirilgan
  let subjectB: string; // biriktirilmagan

  const ADMIN_LOGIN = 'e2e_q_admin';
  const EXPERT_LOGIN = 'e2e_q_expert';

  const singleChoice = (text: string) => ({
    type: QuestionType.SINGLE_CHOICE,
    text,
    options: [
      { text: 'A', isCorrect: true },
      { text: 'B', isCorrect: false },
    ],
  });

  async function login(login: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login, password })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    ds = app.get(DataSource);

    const repo = ds.getRepository(User);
    await repo.delete({ login: ADMIN_LOGIN });
    await repo.delete({ login: EXPERT_LOGIN });
    const hash = (p: string) => bcrypt.hash(p, 4);
    await repo.save(
      repo.create({
        lastName: 'Q',
        firstName: 'Admin',
        login: ADMIN_LOGIN,
        passwordHash: await hash('AdminPass1'),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      }),
    );
    const expert = await repo.save(
      repo.create({
        lastName: 'Q',
        firstName: 'Expert',
        login: EXPERT_LOGIN,
        passwordHash: await hash('ExpertPass1'),
        role: UserRole.EXPERT,
        status: UserStatus.ACTIVE,
      }),
    );
    expertId = expert.id;

    adminToken = await login(ADMIN_LOGIN, 'AdminPass1');
    expertToken = await login(EXPERT_LOGIN, 'ExpertPass1');

    const server = app.getHttpServer();
    const a = await request(server)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Fan A ${Date.now()}` })
      .expect(201);
    subjectA = a.body.id;
    const b = await request(server)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Fan B ${Date.now()}` })
      .expect(201);
    subjectB = b.body.id;

    await request(server)
      .put(`/api/experts/${expertId}/subjects`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectIds: [subjectA] })
      .expect(200);
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      for (const sid of [subjectA, subjectB].filter(Boolean)) {
        await ds.getRepository(Question).delete({ subjectId: sid });
      }
      await ds.getRepository(ExpertSubject).delete({ userId: expertId });
      for (const sid of [subjectA, subjectB].filter(Boolean)) {
        await ds.getRepository(Subject).delete({ id: sid });
      }
      await ds.getRepository(User).delete({ login: ADMIN_LOGIN });
      await ds.getRepository(User).delete({ login: EXPERT_LOGIN });
    }
    await app?.close();
  });

  it('ekspert BEGONA fanga savol kirita olmaydi → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ subjectId: subjectB, ...singleChoice('Begona fan savoli') })
      .expect(403);
  });

  it('ekspert o‘z faniga savol yaratadi → draft, ball qiyinlik bo‘yicha standart (2.00)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Ekspert savoli') })
      .expect(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.points).toBe('2.00');
    expect(res.body.createdBy).toBe(expertId);
  });

  it('noto‘g‘ri shakl (single_choice, to‘g‘ri variant yo‘q) → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subjectId: subjectA,
        type: QuestionType.SINGLE_CHOICE,
        text: 'Yomon savol',
        options: [
          { text: 'A', isCorrect: false },
          { text: 'B', isCorrect: false },
        ],
      })
      .expect(400);
  });

  it('holat oqimi: ekspert approve qila olmaydi (403), admin qiladi; qayta approve → 400', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Oqim savoli') })
      .expect(201);
    const id = created.body.id;

    // Ekspert approve qila olmaydi (admin-only endpoint)
    await request(server)
      .post(`/api/questions/${id}/approve`)
      .set('Authorization', `Bearer ${expertToken}`)
      .expect(403);

    // Admin approve qiladi
    const approved = await request(server)
      .post(`/api/questions/${id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(approved.body.status).toBe('approved');
    expect(approved.body.approvedBy).toBeDefined();

    // Qayta approve → 400 (faqat draft tasdiqlanadi)
    await request(server)
      .post(`/api/questions/${id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    // approved → active
    const active = await request(server)
      .post(`/api/questions/${id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(active.body.status).toBe('active');

    // active'ni to‘g‘ridan-to‘g‘ri activate → 400
    await request(server)
      .post(`/api/questions/${id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('approved savolni ekspert tahrirlay olmaydi → 403 (faqat draft)', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Tahrir savoli') })
      .expect(201);
    const id = created.body.id;
    await request(server)
      .post(`/api/questions/${id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(server)
      .patch(`/api/questions/${id}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ text: 'O‘zgartirilgan' })
      .expect(403);
  });

  it('arxivlangan savol tahrirlanmaydi → 400', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Arxiv savoli') })
      .expect(201);
    const id = created.body.id;
    await request(server)
      .post(`/api/questions/${id}/archive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(server)
      .patch(`/api/questions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ text: 'O‘zgartirilgan' })
      .expect(400);
  });

  it('admin o‘z draftini muvaffaqiyatli tahrirlaydi (matn + variantlar + kategoriya) → 200', async () => {
    const server = app.getHttpServer();
    const cat = await request(server)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectId: subjectA, name: `Kat ${Date.now()}` })
      .expect(201);
    const categoryId = cat.body.id as string;

    const created = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Asl matn') })
      .expect(201);
    const id = created.body.id as string;

    const updated = await request(server)
      .patch(`/api/questions/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'Yangi matn',
        categoryIds: [categoryId],
        options: [
          { text: 'X', isCorrect: false },
          { text: 'Y', isCorrect: true },
        ],
      })
      .expect(200);

    expect(updated.body.text).toBe('Yangi matn');
    expect(updated.body.options).toHaveLength(2);
    const correct = updated.body.options.find((o: { isCorrect: boolean }) => o.isCorrect);
    expect(correct.text).toBe('Y');
    expect(updated.body.categories.map((c: { id: string }) => c.id)).toEqual([categoryId]);
  });

  it('ekspert begona (admin yaratgan) savolni tahrirlay olmaydi → 403', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/api/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjectId: subjectA, ...singleChoice('Admin savoli') })
      .expect(201);
    const id = created.body.id;

    await request(server)
      .patch(`/api/questions/${id}`)
      .set('Authorization', `Bearer ${expertToken}`)
      .send({ text: 'Tegmoqchi' })
      .expect(403);
  });
});
