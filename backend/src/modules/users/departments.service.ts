import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { CreatePositionDto, UpdatePositionDto } from './dto/position.dto';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly depts: Repository<Department>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
  ) {}

  findAllDepartments(): Promise<Department[]> {
    return this.depts.find({ order: { name: 'ASC' } });
  }

  async createDepartment(dto: CreateDepartmentDto): Promise<Department> {
    const dept = this.depts.create({ name: dto.name, parentId: dto.parentId ?? null });
    return this.depts.save(dept);
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.depts.findOne({ where: { id } });
    if (!dept) throw new NotFoundException("Bo'lim topilmadi");
    if (dto.name !== undefined) dept.name = dto.name;
    if (dto.parentId !== undefined) dept.parentId = dto.parentId ?? null;
    if (dto.isActive !== undefined) dept.isActive = dto.isActive;
    return this.depts.save(dept);
  }

  async deleteDepartment(id: string): Promise<void> {
    const result = await this.depts.delete(id);
    if (!result.affected) throw new NotFoundException("Bo'lim topilmadi");
  }

  findAllPositions(departmentId?: string): Promise<Position[]> {
    const where = departmentId ? { departmentId } : {};
    return this.positions.find({ where, order: { name: 'ASC' } });
  }

  async createPosition(dto: CreatePositionDto): Promise<Position> {
    const pos = this.positions.create({ name: dto.name, departmentId: dto.departmentId ?? null });
    return this.positions.save(pos);
  }

  async updatePosition(id: string, dto: UpdatePositionDto): Promise<Position> {
    const pos = await this.positions.findOne({ where: { id } });
    if (!pos) throw new NotFoundException('Lavozim topilmadi');
    if (dto.name !== undefined) pos.name = dto.name;
    if (dto.departmentId !== undefined) pos.departmentId = dto.departmentId ?? null;
    if (dto.isActive !== undefined) pos.isActive = dto.isActive;
    return this.positions.save(pos);
  }

  async deletePosition(id: string): Promise<void> {
    const result = await this.positions.delete(id);
    if (!result.affected) throw new NotFoundException('Lavozim topilmadi');
  }
}
