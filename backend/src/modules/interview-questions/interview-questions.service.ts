import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateInterviewQuestionDto } from './dto/create-interview-question.dto';
import { InterviewQuestionFilterDto } from './dto/interview-question-filter.dto';
import { UpdateInterviewQuestionDto } from './dto/update-interview-question.dto';
import { InterviewQuestion } from './entities/interview-question.entity';

interface AuthContext {
  userId: string;
  ip: string;
}

@Injectable()
export class InterviewQuestionsService {
  constructor(
    @InjectRepository(InterviewQuestion)
    private readonly repo: Repository<InterviewQuestion>,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateInterviewQuestionDto, ctx: AuthContext): Promise<InterviewQuestion> {
    const question = this.repo.create({
      subjectId: dto.subjectId,
      questionText: dto.questionText,
      expectedAnswer: dto.expectedAnswer,
      rationale: dto.rationale ?? null,
      createdBy: ctx.userId,
    });
    const saved = await this.repo.save(question);
    await this.audit.log({
      userId: ctx.userId,
      action: 'interview_question.create',
      entity: 'interview_questions',
      entityId: saved.id,
      ip: ctx.ip,
    });
    return saved;
  }

  findAll(filter: InterviewQuestionFilterDto): Promise<InterviewQuestion[]> {
    const where: FindOptionsWhere<InterviewQuestion> = {};
    if (filter.subjectId) where.subjectId = filter.subjectId;
    if (filter.search) where.questionText = ILike(`%${filter.search}%`);
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<InterviewQuestion> {
    const question = await this.repo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Suhbat savoli topilmadi');
    return question;
  }

  async update(
    id: string,
    dto: UpdateInterviewQuestionDto,
    ctx: AuthContext,
  ): Promise<InterviewQuestion> {
    const question = await this.findOne(id);
    if (dto.subjectId !== undefined) question.subjectId = dto.subjectId;
    if (dto.questionText !== undefined) question.questionText = dto.questionText;
    if (dto.expectedAnswer !== undefined) question.expectedAnswer = dto.expectedAnswer;
    if (dto.rationale !== undefined) question.rationale = dto.rationale ?? null;
    const saved = await this.repo.save(question);
    await this.audit.log({
      userId: ctx.userId,
      action: 'interview_question.update',
      entity: 'interview_questions',
      entityId: saved.id,
      ip: ctx.ip,
    });
    return saved;
  }

  async remove(id: string, ctx: AuthContext): Promise<void> {
    const question = await this.findOne(id);
    await this.repo.remove(question);
    await this.audit.log({
      userId: ctx.userId,
      action: 'interview_question.delete',
      entity: 'interview_questions',
      entityId: id,
      ip: ctx.ip,
    });
  }
}
