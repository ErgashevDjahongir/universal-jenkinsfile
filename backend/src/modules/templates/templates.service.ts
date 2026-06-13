import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { QuestionStatus } from '../../common/enums/question-status.enum';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { messages } from '../../i18n/uz';
import { AuthUser } from '../auth/types/auth-user.interface';
import { Category } from '../subjects/entities/category.entity';
import { Question } from '../questions/entities/question.entity';
import { SubjectsService } from '../subjects/subjects.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateFilterDto } from './dto/template-filter.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateFixedQuestion } from './entities/template-fixed-question.entity';
import { TemplateGradeScale } from './entities/template-grade-scale.entity';
import { TemplateSelectionRule } from './entities/template-selection-rule.entity';
import { TestTemplate } from './entities/test-template.entity';
import { SelectionRuleInput, SelectionShortage, selectQuestions } from './question-selection';

/** Sessiya uchun savol tanlash parametrlari (phase 5 — sessions moduli chaqiradi). */
export interface SelectionOptions {
  /** Yumshoq istisno: avvalgi urinish savollari (qaror §8). */
  excludeQuestionIds?: string[];
  /** Test uchun injektsiya qilinadigan RNG. */
  random?: () => number;
}

const QUIYINLIK: Record<DifficultyLevel, string> = {
  [DifficultyLevel.EASY]: 'oson',
  [DifficultyLevel.MEDIUM]: 'o‘rta',
  [DifficultyLevel.HARD]: 'qiyin',
};

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TestTemplate) private readonly templates: Repository<TestTemplate>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    private readonly subjects: SubjectsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTemplateDto, user: AuthUser): Promise<TestTemplate> {
    await this.validateChildren(dto);

    const id = await this.dataSource.transaction(async (manager) => {
      const template = manager.create(TestTemplate, {
        ...this.scalarColumns(dto),
        status: TemplateStatus.DRAFT,
        createdBy: user.id,
      });
      const saved = await manager.save(template);
      await this.replaceChildren(manager, saved.id, dto);
      return saved.id;
    });

    return this.findOne(id);
  }

  findAll(filter: TemplateFilterDto): Promise<TestTemplate[]> {
    return this.templates.find({
      where: filter.status ? { status: filter.status } : {},
      // Ro'yxat sahifasi fixedQuestions/selectionRules sonini ko'rsatadi —
      // relations'siz bu massivlar undefined bo'lib, frontend qulaydi.
      relations: { fixedQuestions: true, selectionRules: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TestTemplate> {
    const template = await this.templates.findOne({
      where: { id },
      relations: { gradeScale: true, fixedQuestions: true, selectionRules: true },
    });
    if (!template) {
      throw new NotFoundException(messages.template.notFound);
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<TestTemplate> {
    const template = await this.findOne(id);
    if (template.status !== TemplateStatus.DRAFT) {
      throw new BadRequestException(messages.template.onlyDraftEditable);
    }
    await this.validateChildren(dto);

    await this.dataSource.transaction(async (manager) => {
      Object.assign(template, this.scalarColumns(dto));
      // Nested massivlarni save'dan ajratamiz; ularni alohida replace qilamiz.
      const detached = template as Partial<TestTemplate>;
      detached.gradeScale = undefined;
      detached.fixedQuestions = undefined;
      detached.selectionRules = undefined;
      await manager.save(template);
      await this.replaceChildren(manager, id, dto, true);
    });

    return this.findOne(id);
  }

  /** draft → active. Bank yetarliligi tekshiriladi; yetishmasa faollashtirmaydi. */
  async activate(id: string): Promise<TestTemplate> {
    const template = await this.findOne(id);
    if (template.status !== TemplateStatus.DRAFT) {
      throw new BadRequestException(messages.template.activateOnlyDraft);
    }
    if (template.fixedQuestions.length === 0 && template.selectionRules.length === 0) {
      throw new BadRequestException(messages.template.empty);
    }
    await this.assertFixedActive(template);

    const shortages = await this.computeShortages(template);
    if (shortages.length > 0) {
      throw new BadRequestException(
        messages.template.insufficientBank.replace('{{detail}}', this.formatShortages(shortages)),
      );
    }

    template.status = TemplateStatus.ACTIVE;
    await this.templates.save(template);
    return this.findOne(id);
  }

  /** har qanday holatdan → archived. Arxivlangan shablon yangi tayinlovga biriktirilmaydi. */
  async archive(id: string): Promise<TestTemplate> {
    const template = await this.findOne(id);
    if (template.status === TemplateStatus.ARCHIVED) {
      throw new BadRequestException(messages.template.alreadyArchived);
    }
    template.status = TemplateStatus.ARCHIVED;
    await this.templates.save(template);
    return this.findOne(id);
  }

  /**
   * Faollashtirishdan oldin bank yetarliligini tekshirish (admin UI uchun «quruq»
   * hisobot): qaysi qoidada nechta savol yetishmasligini qaytaradi.
   */
  async selectionCheck(id: string): Promise<SelectionShortage[]> {
    const template = await this.findOne(id);
    // Faollashtirish gate'i bilan bir xil bo'lishi uchun majburiy savol
    // faolligini ham tekshiramiz (aks holda «quruq» hisobot yashil, activate qizil).
    await this.assertFixedActive(template);
    return this.computeShortages(template);
  }

  /**
   * Sessiya uchun savollarni tanlaydi (phase 5 — sessions moduli chaqiradi).
   * Faqat «active» shablon; yumshoq `excludeQuestionIds` qabul qiladi.
   * Bank haqiqatan yetmasa (savollar arxivlangan bo'lsa) — xato qaytaradi.
   */
  async selectForSession(templateId: string, options: SelectionOptions = {}): Promise<string[]> {
    const template = await this.findOne(templateId);
    if (template.status !== TemplateStatus.ACTIVE) {
      throw new BadRequestException(messages.template.notActiveForSession);
    }
    // Faollashtirishdan keyin majburiy savol arxivlangan bo'lishi mumkin —
    // arxivlangan savol yangi testga tushmasligi uchun shu yerda ham tekshiramiz.
    await this.assertFixedActive(template);
    const fixedIds = this.orderedFixedIds(template);
    const rules = await this.buildRuleInputs(template.selectionRules);

    const result = selectQuestions({
      fixedIds,
      rules,
      excludeIds: options.excludeQuestionIds,
      random: options.random,
    });

    if (result.shortages.length > 0) {
      throw new BadRequestException(
        messages.template.insufficientBank.replace(
          '{{detail}}',
          this.formatShortages(result.shortages),
        ),
      );
    }
    return result.questionIds;
  }

  // ---- yordamchilar ----

  /** Shortage hisoblash: istisno yo'q (faollashtirish uchun real bank holati). */
  private async computeShortages(template: TestTemplate): Promise<SelectionShortage[]> {
    const rules = await this.buildRuleInputs(template.selectionRules);
    const result = selectQuestions({
      fixedIds: this.orderedFixedIds(template),
      rules,
    });
    return result.shortages;
  }

  private orderedFixedIds(template: TestTemplate): string[] {
    return [...template.fixedQuestions]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((f) => f.questionId);
  }

  /** Har bir qoida uchun mos (status=active) savol id-larini yuklaydi. */
  private async buildRuleInputs(rules: TemplateSelectionRule[]): Promise<SelectionRuleInput[]> {
    return Promise.all(
      rules.map(async (rule) => ({
        subjectId: rule.subjectId,
        categoryId: rule.categoryId,
        difficulty: rule.difficulty,
        questionCount: rule.questionCount,
        candidateIds: await this.loadCandidateIds(rule),
      })),
    );
  }

  private async loadCandidateIds(rule: TemplateSelectionRule): Promise<string[]> {
    const qb = this.questions
      .createQueryBuilder('q')
      .select('q.id', 'id')
      .where('q.subject_id = :subjectId', { subjectId: rule.subjectId })
      .andWhere('q.status = :status', { status: QuestionStatus.ACTIVE });

    if (rule.difficulty) {
      qb.andWhere('q.difficulty = :difficulty', { difficulty: rule.difficulty });
    }
    if (rule.categoryId) {
      qb.andWhere(
        'q.id IN (SELECT question_id FROM question_categories WHERE category_id = :categoryId)',
        { categoryId: rule.categoryId },
      );
    }

    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  /** Majburiy savollar faol (active) ekanini tasdiqlaydi — arxiv/qoralama test ochmaydi. */
  private async assertFixedActive(template: TestTemplate): Promise<void> {
    if (template.fixedQuestions.length === 0) {
      return;
    }
    const ids = template.fixedQuestions.map((f) => f.questionId);
    const active = await this.questions.find({
      where: { id: In(ids), status: QuestionStatus.ACTIVE },
      select: { id: true },
    });
    const activeIds = new Set(active.map((q) => q.id));
    const notActive = ids.filter((id) => !activeIds.has(id));
    if (notActive.length > 0) {
      throw new BadRequestException(
        messages.template.fixedNotActive.replace('{{ids}}', notActive.join(', ')),
      );
    }
  }

  /** create/update'dagi nested ma'lumotlarni tekshiradi (savol/fan/kategoriya mavjudligi). */
  private async validateChildren(dto: CreateTemplateDto | UpdateTemplateDto): Promise<void> {
    if (dto.fixedQuestions !== undefined) {
      const ids = dto.fixedQuestions.map((f) => f.questionId);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException(messages.template.fixedDuplicate);
      }
      if (ids.length > 0) {
        const found = await this.questions.find({ where: { id: In(ids) }, select: { id: true } });
        const foundIds = new Set(found.map((q) => q.id));
        const missing = ids.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
          throw new BadRequestException(
            messages.template.fixedNotFound.replace('{{ids}}', missing.join(', ')),
          );
        }
      }
    }

    if (dto.selectionRules !== undefined) {
      await this.validateRules(dto.selectionRules);
    }

    if (dto.gradeScale !== undefined) {
      const grades = dto.gradeScale.map((g) => g.grade);
      if (new Set(grades).size !== grades.length) {
        throw new BadRequestException(messages.template.gradeScaleDuplicate);
      }
    }
  }

  private async validateRules(
    rules: NonNullable<CreateTemplateDto['selectionRules']>,
  ): Promise<void> {
    const subjectIds = [...new Set(rules.map((r) => r.subjectId))];
    for (const subjectId of subjectIds) {
      await this.subjects.assertExists(subjectId);
    }

    const categoryIds = [
      ...new Set(rules.map((r) => r.categoryId).filter((c): c is string => !!c)),
    ];
    if (categoryIds.length === 0) {
      return;
    }
    const found = await this.categories.find({ where: { id: In(categoryIds) } });
    const bySubject = new Map(found.map((c) => [c.id, c.subjectId]));
    for (const rule of rules) {
      if (!rule.categoryId) {
        continue;
      }
      const owner = bySubject.get(rule.categoryId);
      if (owner === undefined) {
        throw new NotFoundException(messages.category.notFound);
      }
      if (owner !== rule.subjectId) {
        throw new BadRequestException(messages.template.ruleCategoryMismatch);
      }
    }
  }

  /** DTO skalyar maydonlarini entity ustunlariga moslaydi (faqat berilganlar). */
  private scalarColumns(dto: CreateTemplateDto | UpdateTemplateDto): Partial<TestTemplate> {
    const out: Partial<TestTemplate> = {};
    if (dto.title !== undefined) out.title = dto.title;
    if (dto.description !== undefined) out.description = dto.description ?? null;
    if (dto.timeLimitMinutes !== undefined) out.timeLimitMinutes = dto.timeLimitMinutes;
    if (dto.passingScorePercent !== undefined)
      out.passingScorePercent = dto.passingScorePercent.toFixed(2);
    if (dto.maxAttempts !== undefined) out.maxAttempts = dto.maxAttempts;
    if (dto.attemptIntervalMinutes !== undefined)
      out.attemptIntervalMinutes = dto.attemptIntervalMinutes;
    if (dto.navigation !== undefined) out.navigation = dto.navigation;
    if (dto.resultVisibility !== undefined) out.resultVisibility = dto.resultVisibility;
    if (dto.shuffleQuestions !== undefined) out.shuffleQuestions = dto.shuffleQuestions;
    if (dto.shuffleOptions !== undefined) out.shuffleOptions = dto.shuffleOptions;
    if (dto.partialScoring !== undefined) out.partialScoring = dto.partialScoring;
    if (dto.negativeMarking !== undefined) out.negativeMarking = dto.negativeMarking;
    if (dto.negativePoints !== undefined) out.negativePoints = dto.negativePoints.toFixed(2);
    if (dto.avoidRepeatQuestions !== undefined) out.avoidRepeatQuestions = dto.avoidRepeatQuestions;
    if (dto.maxTabSwitches !== undefined) out.maxTabSwitches = dto.maxTabSwitches;
    return out;
  }

  /**
   * Nested bog'liqliklarni yozadi. `replaceExisting` true bo'lsa (update),
   * faqat dto'da BERILGAN massivlar to'liq almashtiriladi.
   */
  private async replaceChildren(
    manager: EntityManager,
    templateId: string,
    dto: CreateTemplateDto | UpdateTemplateDto,
    replaceExisting = false,
  ): Promise<void> {
    if (dto.gradeScale !== undefined) {
      if (replaceExisting) await manager.delete(TemplateGradeScale, { templateId });
      if (dto.gradeScale.length > 0) {
        await manager.insert(
          TemplateGradeScale,
          dto.gradeScale.map((g) => ({
            templateId,
            grade: g.grade,
            minPercent: g.minPercent.toFixed(2),
          })),
        );
      }
    }

    if (dto.fixedQuestions !== undefined) {
      if (replaceExisting) await manager.delete(TemplateFixedQuestion, { templateId });
      if (dto.fixedQuestions.length > 0) {
        await manager.insert(
          TemplateFixedQuestion,
          dto.fixedQuestions.map((f, idx) => ({
            templateId,
            questionId: f.questionId,
            pointsOverride: f.pointsOverride !== undefined ? f.pointsOverride.toFixed(2) : null,
            orderIndex: idx,
          })),
        );
      }
    }

    if (dto.selectionRules !== undefined) {
      if (replaceExisting) await manager.delete(TemplateSelectionRule, { templateId });
      if (dto.selectionRules.length > 0) {
        await manager.insert(
          TemplateSelectionRule,
          dto.selectionRules.map((r) => ({
            templateId,
            subjectId: r.subjectId,
            categoryId: r.categoryId ?? null,
            difficulty: r.difficulty ?? null,
            questionCount: r.questionCount,
          })),
        );
      }
    }
  }

  /** Shortage ro'yxatini o'zbekcha o'qiladigan matnga aylantiradi. */
  private formatShortages(shortages: SelectionShortage[]): string {
    return shortages
      .map((s) => {
        const parts = [`fan ${s.subjectId}`];
        if (s.categoryId) parts.push(`kategoriya ${s.categoryId}`);
        if (s.difficulty) parts.push(`qiyinlik «${QUIYINLIK[s.difficulty]}»`);
        return `${s.ruleIndex + 1}-qoida (${parts.join(', ')}): ${s.missing} ta savol yetishmaydi (${s.available}/${s.requested})`;
      })
      .join('; ');
  }
}
