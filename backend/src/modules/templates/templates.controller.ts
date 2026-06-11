import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateFilterDto } from './dto/template-filter.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TestTemplate } from './entities/test-template.entity';
import { SelectionShortage } from './question-selection';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Test shabloni yaratish (draft)' })
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthUser): Promise<TestTemplate> {
    return this.templates.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Shablonlar ro‘yxati (status bo‘yicha filtr)' })
  findAll(@Query() filter: TemplateFilterDto): Promise<TestTemplate[]> {
    return this.templates.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Shablon ma’lumoti' })
  findOne(@Param('id') id: string): Promise<TestTemplate> {
    return this.templates.findOne(id);
  }

  @Get(':id/selection-check')
  @ApiOperation({ summary: 'Bank yetarliligi tekshiruvi (faollashtirishdan oldin quruq hisobot)' })
  selectionCheck(@Param('id') id: string): Promise<SelectionShortage[]> {
    return this.templates.selectionCheck(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Shablonni tahrirlash (faqat draft)' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto): Promise<TestTemplate> {
    return this.templates.update(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Shablonni faollashtirish (draft → active; bank yetarliligi tekshiriladi)',
  })
  @ApiResponse({ status: 400, description: 'Bankda yetarli savol yo‘q yoki shablon bo‘sh' })
  activate(@Param('id') id: string): Promise<TestTemplate> {
    return this.templates.activate(id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Shablonni arxivlash (→ archived; yangi tayinlovga tushmaydi)' })
  archive(@Param('id') id: string): Promise<TestTemplate> {
    return this.templates.archive(id);
  }
}
