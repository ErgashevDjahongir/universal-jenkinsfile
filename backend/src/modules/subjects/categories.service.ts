import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { messages } from '../../i18n/uz';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';
import { SubjectsService } from './subjects.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly subjects: SubjectsService,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.subjects.assertExists(dto.subjectId);
    if (dto.parentId) {
      await this.assertParentInSameSubject(dto.parentId, dto.subjectId);
    }
    const category = this.categories.create({
      subjectId: dto.subjectId,
      name: dto.name,
      parentId: dto.parentId ?? null,
    });
    return this.categories.save(category);
  }

  findBySubject(subjectId: string): Promise<Category[]> {
    return this.categories.find({ where: { subjectId }, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(messages.category.notFound);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException(messages.category.selfParent);
      }
      if (dto.parentId) {
        await this.assertParentInSameSubject(dto.parentId, category.subjectId);
        await this.assertNoCycle(id, dto.parentId);
      }
      category.parentId = dto.parentId || null;
    }
    return this.categories.save(category);
  }

  private async assertParentInSameSubject(parentId: string, subjectId: string): Promise<void> {
    const parent = await this.categories.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException(messages.category.notFound);
    }
    if (parent.subjectId !== subjectId) {
      throw new BadRequestException(messages.category.subjectMismatch);
    }
  }

  /**
   * Ajdodlar zanjirini yuqoriga yurib, yangi ota orqali halqa (A→B→A) hosil
   * bo‘lishini bloklaydi (to‘g‘ridan-to‘g‘ri o‘ziga ota bo‘lishdan tashqari ko‘p tugunli).
   */
  private async assertNoCycle(categoryId: string, parentId: string): Promise<void> {
    const seen = new Set<string>();
    let current: string | null = parentId;
    while (current) {
      if (current === categoryId) {
        throw new BadRequestException(messages.category.cycle);
      }
      if (seen.has(current)) {
        break; // mavjud halqa — cheksiz aylanmaslik uchun to‘xtaymiz
      }
      seen.add(current);
      const parent: Category | null = await this.categories.findOne({ where: { id: current } });
      current = parent?.parentId ?? null;
    }
  }
}
