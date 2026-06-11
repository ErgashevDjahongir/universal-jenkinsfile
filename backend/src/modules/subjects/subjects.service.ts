import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { messages } from '../../i18n/uz';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { Subject } from './entities/subject.entity';

/** Faqat PostgreSQL unique_violation (23505) — boshqa DB xatolarini maskalamaslik uchun. */
function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) {
    return false;
  }
  const driverError = err.driverError as { code?: string } | undefined;
  return driverError?.code === '23505';
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
  ) {}

  async create(dto: CreateSubjectDto): Promise<Subject> {
    try {
      const subject = this.subjects.create({
        name: dto.name,
        description: dto.description ?? null,
      });
      return await this.subjects.save(subject);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(messages.subject.nameExists);
      }
      throw err;
    }
  }

  findAll(): Promise<Subject[]> {
    return this.subjects.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Subject> {
    const subject = await this.subjects.findOne({ where: { id } });
    if (!subject) {
      throw new NotFoundException(messages.subject.notFound);
    }
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = await this.findOne(id);
    if (dto.name !== undefined) subject.name = dto.name;
    if (dto.description !== undefined) subject.description = dto.description;
    if (dto.isActive !== undefined) subject.isActive = dto.isActive;
    try {
      return await this.subjects.save(subject);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(messages.subject.nameExists);
      }
      throw err;
    }
  }

  /** Fan mavjudligini tasdiqlaydi (boshqa servislar uchun). */
  async assertExists(id: string): Promise<void> {
    const exists = await this.subjects.exists({ where: { id } });
    if (!exists) {
      throw new NotFoundException(messages.subject.notFound);
    }
  }
}
