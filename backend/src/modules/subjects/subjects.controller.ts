import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { Subject } from './entities/subject.entity';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Fan yaratish' })
  create(@Body() dto: CreateSubjectDto): Promise<Subject> {
    return this.subjects.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Fanlar ro‘yxati' })
  findAll(): Promise<Subject[]> {
    return this.subjects.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fan ma’lumoti' })
  findOne(@Param('id') id: string): Promise<Subject> {
    return this.subjects.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Fanni tahrirlash / faolligini o‘zgartirish' })
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto): Promise<Subject> {
    return this.subjects.update(id, dto);
  }
}
