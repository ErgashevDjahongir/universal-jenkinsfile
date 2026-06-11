import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { QuestionStatus } from '../../common/enums/question-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { messages } from '../../i18n/uz';
import { AuthUser } from '../auth/types/auth-user.interface';
import { SettingsService } from '../settings/settings.service';
import { Category } from '../subjects/entities/category.entity';
import { ExpertSubjectsService } from '../subjects/expert-subjects.service';
import { SubjectsService } from '../subjects/subjects.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { Question } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuestionAttachment } from './entities/question-attachment.entity';
import { QuestionVersion } from './entities/question-version.entity';
import { validateQuestionShape } from './question-rules';

/** Yuklangan rasm uchun minimal interfeys (multer file). */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB
const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads', 'questions');

/** Fayl kontenti haqiqatan png/jpg ekanini sehrli baytlar orqali tekshiradi. */
function hasImageMagic(buffer: Buffer, ext: string): boolean {
  if (ext === 'png') {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (ext === 'jpg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return false;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(QuestionAttachment)
    private readonly attachments: Repository<QuestionAttachment>,
    private readonly subjects: SubjectsService,
    private readonly expertSubjects: ExpertSubjectsService,
    private readonly settings: SettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateQuestionDto, user: AuthUser): Promise<Question> {
    await this.subjects.assertExists(dto.subjectId);
    await this.assertExpertCanWriteSubject(user, dto.subjectId);
    validateQuestionShape(dto.type, dto.options, dto.answerKey);

    const difficulty = dto.difficulty ?? DifficultyLevel.MEDIUM;
    const points = dto.points ?? (await this.settings.getDefaultPoints(difficulty));
    const categories = await this.loadCategories(dto.categoryIds, dto.subjectId);

    const id = await this.dataSource.transaction(async (manager) => {
      // categories'ni cascade-save'ga qo'shmaymiz: options bilan birga ikkita
      // relation bo'lsa, TypeORM relation-id'larni bitta ulanishda parallel
      // yuklab, pg ogohlantirishini chiqaradi. Junction'ni alohida biriktiramiz.
      const question = manager.create(Question, {
        subjectId: dto.subjectId,
        type: dto.type,
        difficulty,
        text: dto.text,
        points: points.toFixed(2),
        status: QuestionStatus.DRAFT,
        explanation: dto.explanation ?? null,
        answerKey: dto.answerKey ?? null,
        createdBy: user.id,
        options: this.buildOptions(manager, dto),
      });
      const saved = await manager.save(question);
      await this.attachCategories(manager, saved.id, categories, []);
      saved.categories = categories;
      await this.writeSnapshot(manager, saved, user.id);
      return saved.id;
    });

    return this.findOne(id, user);
  }

  async findAll(filter: QuestionFilterDto, user: AuthUser): Promise<Question[]> {
    const qb = this.questions
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.options', 'o')
      .leftJoinAndSelect('q.categories', 'c')
      .orderBy('q.id', 'DESC');

    if (user.role === UserRole.EXPERT) {
      const assigned = (await this.expertSubjects.listForExpert(user.id)).map((e) => e.subjectId);
      if (assigned.length === 0) {
        return [];
      }
      if (filter.subjectId && !assigned.includes(filter.subjectId)) {
        return [];
      }
      qb.andWhere('q.subjectId IN (:...assigned)', { assigned });
    }

    if (filter.subjectId) qb.andWhere('q.subjectId = :subjectId', { subjectId: filter.subjectId });
    if (filter.status) qb.andWhere('q.status = :status', { status: filter.status });
    if (filter.difficulty)
      qb.andWhere('q.difficulty = :difficulty', { difficulty: filter.difficulty });
    if (filter.type) qb.andWhere('q.type = :type', { type: filter.type });
    if (filter.categoryId) {
      qb.andWhere(
        'q.id IN (SELECT question_id FROM question_categories WHERE category_id = :categoryId)',
        { categoryId: filter.categoryId },
      );
    }

    return qb.getMany();
  }

  async findOne(id: string, user: AuthUser): Promise<Question> {
    const question = await this.questions.findOne({
      where: { id },
      relations: { options: true, categories: true },
    });
    if (!question) {
      throw new NotFoundException(messages.question.notFound);
    }
    if (user.role === UserRole.EXPERT) {
      const allowed = await this.expertSubjects.isAssigned(user.id, question.subjectId);
      if (!allowed) {
        throw new ForbiddenException(messages.question.expertForeignSubject);
      }
    }
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto, user: AuthUser): Promise<Question> {
    const question = await this.questions.findOne({
      where: { id },
      relations: { options: true, categories: true },
    });
    if (!question) {
      throw new NotFoundException(messages.question.notFound);
    }
    this.assertModifiable(question, user);

    const targetSubjectId = dto.subjectId ?? question.subjectId;
    if (dto.subjectId && dto.subjectId !== question.subjectId) {
      await this.subjects.assertExists(dto.subjectId);
      await this.assertExpertCanWriteSubject(user, dto.subjectId);
    }

    const targetType = dto.type ?? question.type;
    const targetAnswerKey = dto.answerKey !== undefined ? dto.answerKey : question.answerKey;
    if (dto.options !== undefined || dto.type !== undefined || dto.answerKey !== undefined) {
      const effectiveOptions =
        dto.options ?? question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }));
      validateQuestionShape(targetType, effectiveOptions, targetAnswerKey);
    }

    const categories =
      dto.categoryIds !== undefined
        ? await this.loadCategories(dto.categoryIds, targetSubjectId)
        : undefined;

    const existingCategoryIds = question.categories.map((c) => c.id);
    const snapshotCategories = categories ?? question.categories;

    await this.dataSource.transaction(async (manager) => {
      question.subjectId = targetSubjectId;
      question.type = targetType;
      if (dto.difficulty !== undefined) question.difficulty = dto.difficulty;
      if (dto.text !== undefined) question.text = dto.text;
      if (dto.points !== undefined) question.points = dto.points.toFixed(2);
      if (dto.explanation !== undefined) question.explanation = dto.explanation;
      if (dto.answerKey !== undefined) question.answerKey = dto.answerKey;

      if (dto.options !== undefined) {
        await manager.delete(QuestionOption, { questionId: id });
        question.options = dto.options.map((o, idx) =>
          manager.create(QuestionOption, {
            questionId: id,
            text: o.text,
            isCorrect: o.isCorrect ?? false,
            orderIndex: o.orderIndex ?? idx,
            matchPair: o.matchPair ?? null,
          }),
        );
      }

      // categories'ni save'dan ajratamiz (bitta relation = parallel so'rov yo'q).
      (question as { categories?: Category[] }).categories = undefined;
      const saved = await manager.save(question);
      if (categories !== undefined) {
        await this.attachCategories(manager, id, categories, existingCategoryIds);
      }
      saved.categories = snapshotCategories;
      await this.writeSnapshot(manager, saved, user.id);
    });

    return this.findOne(id, user);
  }

  /** draft → approved (faqat admin/super_admin; controller @Roles bilan). */
  async approve(id: string, user: AuthUser): Promise<Question> {
    const question = await this.getOrFail(id);
    if (question.status !== QuestionStatus.DRAFT) {
      throw new BadRequestException(messages.question.approveOnlyDraft);
    }
    question.status = QuestionStatus.APPROVED;
    question.approvedBy = user.id;
    question.approvedAt = new Date();
    return this.saveWithSnapshot(question, user.id);
  }

  /** approved → active. */
  async activate(id: string, user: AuthUser): Promise<Question> {
    const question = await this.getOrFail(id);
    if (question.status !== QuestionStatus.APPROVED) {
      throw new BadRequestException(messages.question.activateOnlyApproved);
    }
    question.status = QuestionStatus.ACTIVE;
    return this.saveWithSnapshot(question, user.id);
  }

  /** har qanday holatdan → archived (arxivlangandan tashqari). */
  async archive(id: string, user: AuthUser): Promise<Question> {
    const question = await this.getOrFail(id);
    if (question.status === QuestionStatus.ARCHIVED) {
      throw new BadRequestException(messages.question.invalidTransition);
    }
    question.status = QuestionStatus.ARCHIVED;
    return this.saveWithSnapshot(question, user.id);
  }

  // ---- yordamchilar ----

  private async getOrFail(id: string): Promise<Question> {
    const question = await this.questions.findOne({
      where: { id },
      relations: { options: true, categories: true },
    });
    if (!question) {
      throw new NotFoundException(messages.question.notFound);
    }
    return question;
  }

  private async saveWithSnapshot(question: Question, userId: string): Promise<Question> {
    // Holat o'zgarishlari kategoriyalarni o'zgartirmaydi; categories'ni save'dan
    // ajratib (faqat options relation qoladi) parallel relation-id yuklashning oldini olamiz.
    const snapshotCategories = question.categories ?? [];
    (question as { categories?: Category[] }).categories = undefined;
    await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(question);
      saved.categories = snapshotCategories;
      await this.writeSnapshot(manager, saved, userId);
    });
    return this.getOrFail(question.id);
  }

  /** Savol tahrirlanishi mumkinligini tekshiradi (update va attachment uchun umumiy). */
  private assertModifiable(question: Question, user: AuthUser): void {
    if (question.status === QuestionStatus.ARCHIVED) {
      throw new BadRequestException(messages.question.archivedImmutable);
    }
    if (user.role === UserRole.EXPERT) {
      if (question.createdBy !== user.id) {
        throw new ForbiddenException(messages.question.expertNotOwner);
      }
      if (question.status !== QuestionStatus.DRAFT) {
        throw new ForbiddenException(messages.question.expertOnlyDraft);
      }
    }
  }

  /** Savolga rasm biriktiradi: faqat png/jpg, maks 2 MB, fayl qayta nomlanadi. */
  async addAttachment(
    id: string,
    file: UploadedImage,
    user: AuthUser,
  ): Promise<QuestionAttachment> {
    const question = await this.getOrFail(id);
    this.assertModifiable(question, user);

    const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
    // Mime sarlavhasi (client tomonidan yuboriladi) yetarli emas — fayl kontentini
    // sehrli baytlar bilan ham tekshiramiz (spoofing himoyasi).
    if (!ext || !hasImageMagic(file.buffer, ext)) {
      throw new BadRequestException(messages.question.attachmentType);
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException(messages.question.attachmentSize);
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(join(UPLOAD_DIR, filename), file.buffer);

    const attachment = this.attachments.create({
      questionId: id,
      filePath: join('uploads', 'questions', filename),
      mimeType: file.mimetype,
      fileSize: file.size,
    });
    return this.attachments.save(attachment);
  }

  /** Ekspert begona fan savolining rasmlarini ko'rmasligi uchun findOne orqali ruxsat tekshiriladi. */
  async listAttachments(id: string, user: AuthUser): Promise<QuestionAttachment[]> {
    await this.findOne(id, user);
    return this.attachments.find({ where: { questionId: id }, order: { id: 'ASC' } });
  }

  /**
   * Savol↔kategoriya junction'ini delta bilan yangilaydi (relation query builder).
   * Cascade-save'dan tashqarida ishlaydi — shu sabab save bitta relation bilan qoladi.
   */
  private async attachCategories(
    manager: EntityManager,
    questionId: string,
    desired: Category[],
    currentIds: string[],
  ): Promise<void> {
    const desiredIds = desired.map((c) => c.id);
    const toAdd = desiredIds.filter((cid) => !currentIds.includes(cid));
    const toRemove = currentIds.filter((cid) => !desiredIds.includes(cid));
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .relation(Question, 'categories')
      .of(questionId)
      .addAndRemove(toAdd, toRemove);
  }

  private buildOptions(manager: EntityManager, dto: CreateQuestionDto): QuestionOption[] {
    return (dto.options ?? []).map((o, idx) =>
      manager.create(QuestionOption, {
        text: o.text,
        isCorrect: o.isCorrect ?? false,
        orderIndex: o.orderIndex ?? idx,
        matchPair: o.matchPair ?? null,
      }),
    );
  }

  private async assertExpertCanWriteSubject(user: AuthUser, subjectId: string): Promise<void> {
    if (user.role !== UserRole.EXPERT) {
      return;
    }
    const allowed = await this.expertSubjects.isAssigned(user.id, subjectId);
    if (!allowed) {
      throw new ForbiddenException(messages.question.expertForeignSubject);
    }
  }

  private async loadCategories(ids: string[] | undefined, subjectId: string): Promise<Category[]> {
    if (!ids || ids.length === 0) {
      return [];
    }
    const found = await this.categories.find({ where: { id: In(ids) } });
    if (found.length !== ids.length) {
      throw new NotFoundException(messages.category.notFound);
    }
    if (found.some((c) => c.subjectId !== subjectId)) {
      throw new BadRequestException(messages.category.subjectMismatch);
    }
    return found;
  }

  private async writeSnapshot(
    manager: EntityManager,
    question: Question,
    userId: string,
  ): Promise<void> {
    const snapshot = manager.create(QuestionVersion, {
      questionId: question.id,
      changedBy: userId,
      snapshot: {
        text: question.text,
        type: question.type,
        difficulty: question.difficulty,
        points: question.points,
        status: question.status,
        answerKey: question.answerKey,
        explanation: question.explanation,
        options: (question.options ?? []).map((o) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
          matchPair: o.matchPair,
        })),
        categoryIds: (question.categories ?? []).map((c) => c.id),
      },
    });
    await manager.save(snapshot);
  }
}
