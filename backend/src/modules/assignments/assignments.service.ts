import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { TemplateStatus } from '../../common/enums/template-status.enum';
import { messages } from '../../i18n/uz';
import { AuthUser } from '../auth/types/auth-user.interface';
import { TemplatesService } from '../templates/templates.service';
import { UsersService } from '../users/users.service';
import { AssignmentFilterDto } from './dto/assignment-filter.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { GenerateCodesDto } from './dto/generate-codes.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AccessCode } from './entities/access-code.entity';
import { AssignmentTarget } from './entities/assignment-target.entity';
import { GroupMember } from './entities/group-member.entity';
import { TestAssignment } from './entities/test-assignment.entity';
import { UserGroup } from './entities/user-group.entity';
import { generateAccessCode } from './access-code.util';

/** Postgres unikal cheklov buzilishi kodi. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(TestAssignment) private readonly assignments: Repository<TestAssignment>,
    @InjectRepository(AccessCode) private readonly codes: Repository<AccessCode>,
    @InjectRepository(UserGroup) private readonly groups: Repository<UserGroup>,
    @InjectRepository(GroupMember) private readonly groupMembers: Repository<GroupMember>,
    private readonly templates: TemplatesService,
    private readonly users: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAssignmentDto, user: AuthUser): Promise<TestAssignment> {
    await this.assertActiveTemplate(dto.templateId);
    const window = this.parseWindow(dto.startsAt, dto.endsAt);
    await this.validateTargets(dto.targets);

    const id = await this.dataSource.transaction(async (manager) => {
      const assignment = manager.create(TestAssignment, {
        templateId: dto.templateId,
        title: dto.title,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        createdBy: user.id,
        targets: dto.targets.map((t) =>
          manager.create(AssignmentTarget, {
            userId: t.userId ?? null,
            groupId: t.groupId ?? null,
          }),
        ),
      });
      const saved = await manager.save(assignment);
      return saved.id;
    });

    return this.findOne(id);
  }

  findAll(filter: AssignmentFilterDto): Promise<TestAssignment[]> {
    return this.assignments.find({
      where: filter.templateId ? { templateId: filter.templateId } : {},
      relations: { targets: true },
      order: { id: 'DESC' },
    });
  }

  async findOne(id: string): Promise<TestAssignment> {
    const assignment = await this.assignments.findOne({
      where: { id },
      relations: { targets: true, codes: true },
    });
    if (!assignment) {
      throw new NotFoundException(messages.assignment.notFound);
    }
    return assignment;
  }

  async update(id: string, dto: UpdateAssignmentDto): Promise<TestAssignment> {
    const assignment = await this.findOne(id);

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : assignment.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : assignment.endsAt;
    if (endsAt <= startsAt) {
      throw new BadRequestException(messages.assignment.invalidWindow);
    }

    if (dto.title !== undefined) assignment.title = dto.title;
    assignment.startsAt = startsAt;
    assignment.endsAt = endsAt;
    await this.assignments.save(assignment);
    return this.findOne(id);
  }

  /** Tayinlovni o'chiradi — faqat hech bir sessiya ochilmagan bo'lsa (FK RESTRICT). */
  async remove(id: string): Promise<void> {
    const assignment = await this.findOne(id);
    try {
      await this.assignments.remove(assignment);
    } catch (error) {
      if (this.pgCode(error) === '23503') {
        throw new BadRequestException(messages.assignment.hasSessions);
      }
      throw error;
    }
  }

  /**
   * Bir martalik kodlar generatsiyasi (aynan bitta rejim).
   * `perUser` — maqsadlarni foydalanuvchilarga (guruhlarni a'zolargacha) yoyib,
   * hali ishlatilmagan kodi yo'q har bir userga bitta kod; `count` — anonim kodlar.
   */
  async generateCodes(id: string, dto: GenerateCodesDto): Promise<AccessCode[]> {
    const assignment = await this.findOne(id);

    const perUser = dto.perUser === true;
    const wantsCount = dto.count !== undefined;
    if (perUser === wantsCount) {
      throw new BadRequestException(messages.assignment.codesModeRequired);
    }

    if (perUser) {
      const userIds = await this.resolveTargetUserIds(assignment);
      if (userIds.length === 0) {
        throw new BadRequestException(messages.assignment.noTargetUsers);
      }
      // Hali ishlatilmagan kodi bor foydalanuvchilarni qayta kodlamaymiz.
      const existing = await this.codes.find({
        where: { assignmentId: id, userId: In(userIds) },
        select: { userId: true, usedAt: true },
      });
      const alreadyHasUnused = new Set(
        existing.filter((c) => c.usedAt === null && c.userId !== null).map((c) => c.userId),
      );
      const targets = userIds.filter((uid) => !alreadyHasUnused.has(uid));
      return this.insertCodes(
        id,
        targets.map((uid) => ({ userId: uid })),
      );
    }

    return this.insertCodes(
      id,
      Array.from({ length: dto.count as number }, () => ({ userId: null })),
    );
  }

  listCodes(id: string): Promise<AccessCode[]> {
    return this.codes.find({ where: { assignmentId: id }, order: { id: 'ASC' } });
  }

  /** Maqsad sifatida tanlash uchun guruhlar ro'yxati (a'zolar soni bilan). */
  async listGroups(): Promise<{ id: string; name: string; memberCount: number }[]> {
    const groups = await this.groups.find({ order: { name: 'ASC' } });
    if (groups.length === 0) {
      return [];
    }
    const counts = await this.groupMembers
      .createQueryBuilder('gm')
      .select('gm.group_id', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('gm.group_id IN (:...ids)', { ids: groups.map((g) => g.id) })
      .groupBy('gm.group_id')
      .getRawMany<{ groupId: string; count: string }>();
    const byId = new Map(counts.map((c) => [c.groupId, Number(c.count)]));
    return groups.map((g) => ({ id: g.id, name: g.name, memberCount: byId.get(g.id) ?? 0 }));
  }

  // ---- yordamchilar ----

  private async assertActiveTemplate(templateId: string): Promise<void> {
    // findOne shablon yo'qligida 404 beradi; faqat «active» biriktiriladi.
    const template = await this.templates.findOne(templateId);
    if (template.status !== TemplateStatus.ACTIVE) {
      throw new BadRequestException(messages.assignment.templateNotActive);
    }
  }

  private parseWindow(startsAt: string, endsAt: string): { startsAt: Date; endsAt: Date } {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (end <= start) {
      throw new BadRequestException(messages.assignment.invalidWindow);
    }
    return { startsAt: start, endsAt: end };
  }

  private async validateTargets(targets: CreateAssignmentDto['targets']): Promise<void> {
    const userIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const target of targets) {
      const hasUser = target.userId !== undefined;
      const hasGroup = target.groupId !== undefined;
      if (hasUser === hasGroup) {
        throw new BadRequestException(messages.assignment.targetExactlyOne);
      }
      if (hasUser) userIds.add(target.userId as string);
      if (hasGroup) groupIds.add(target.groupId as string);
    }

    if (userIds.size > 0) {
      const found = await this.users.findByIds(Array.from(userIds));
      if (found.length !== userIds.size) {
        throw new BadRequestException(messages.assignment.targetUserNotFound);
      }
    }
    if (groupIds.size > 0) {
      const found = await this.groups.find({
        where: { id: In(Array.from(groupIds)) },
        select: { id: true },
      });
      if (found.length !== groupIds.size) {
        throw new BadRequestException(messages.assignment.targetGroupNotFound);
      }
    }
  }

  /** Maqsadlarni alohida foydalanuvchi id-larining yagona ro'yxatiga yoyadi. */
  private async resolveTargetUserIds(assignment: TestAssignment): Promise<string[]> {
    const direct = assignment.targets
      .filter((t) => t.userId !== null)
      .map((t) => t.userId as string);
    const groupIds = assignment.targets
      .filter((t) => t.groupId !== null)
      .map((t) => t.groupId as string);

    let memberIds: string[] = [];
    if (groupIds.length > 0) {
      const members = await this.groupMembers.find({
        where: { groupId: In(groupIds) },
        select: { userId: true },
      });
      memberIds = members.map((m) => m.userId);
    }
    return Array.from(new Set([...direct, ...memberIds]));
  }

  /** Kodlarni unikal to'qnashuvga chidamli tarzda yozadi (bir necha urinish). */
  private async insertCodes(
    assignmentId: string,
    rows: { userId: string | null }[],
  ): Promise<AccessCode[]> {
    if (rows.length === 0) {
      return [];
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const used = new Set<string>();
      const entities = rows.map((row) => {
        let code = generateAccessCode();
        while (used.has(code)) {
          code = generateAccessCode();
        }
        used.add(code);
        return this.codes.create({ assignmentId, code, userId: row.userId });
      });
      try {
        return await this.codes.save(entities);
      } catch (error) {
        if (this.pgCode(error) === PG_UNIQUE_VIOLATION) {
          continue; // kod to'qnashdi — qayta generatsiya
        }
        throw error;
      }
    }
    throw new BadRequestException(messages.assignment.codeGenerationFailed);
  }

  private pgCode(error: unknown): string | undefined {
    if (error instanceof QueryFailedError) {
      return (error.driverError as { code?: string }).code;
    }
    return undefined;
  }
}
