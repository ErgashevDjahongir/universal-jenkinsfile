import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Kategoriya yaratish (ierarxik)' })
  create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Fan bo‘yicha kategoriyalar' })
  @ApiQuery({ name: 'subjectId', required: true })
  findBySubject(@Query('subjectId') subjectId: string): Promise<Category[]> {
    return this.categories.findBySubject(subjectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Kategoriya ma’lumoti' })
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Kategoriyani tahrirlash' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<Category> {
    return this.categories.update(id, dto);
  }
}
