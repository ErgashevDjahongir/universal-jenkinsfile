import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { AssignmentsService } from './assignments.service';
import { AssignmentFilterDto } from './dto/assignment-filter.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { GenerateCodesDto } from './dto/generate-codes.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AccessCode } from './entities/access-code.entity';
import { TestAssignment } from './entities/test-assignment.entity';

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tayinlov yaratish (faqat «active» shablon biriktiriladi)' })
  @ApiResponse({ status: 400, description: 'Shablon faol emas yoki maqsad/oyna noto‘g‘ri' })
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthUser): Promise<TestAssignment> {
    return this.assignments.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Tayinlovlar ro‘yxati' })
  findAll(@Query() filter: AssignmentFilterDto): Promise<TestAssignment[]> {
    return this.assignments.findAll(filter);
  }

  // Diqqat: `:id` marshrutidan OLDIN turishi shart, aks holda «groups» id deb qabul qilinadi.
  @Get('groups')
  @ApiOperation({ summary: 'Guruhlar ro‘yxati (maqsad tanlash uchun, a’zolar soni bilan)' })
  listGroups(): Promise<{ id: string; name: string; memberCount: number }[]> {
    return this.assignments.listGroups();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tayinlov ma’lumoti (maqsadlar + kodlar)' })
  findOne(@Param('id') id: string): Promise<TestAssignment> {
    return this.assignments.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Tayinlovni tahrirlash (nomi va faollik oynasi)' })
  update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto): Promise<TestAssignment> {
    return this.assignments.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tayinlovni o‘chirish (faqat sessiya ochilmagan bo‘lsa)' })
  @ApiResponse({ status: 400, description: 'Tayinlovga sessiyalar bog‘langan' })
  remove(@Param('id') id: string): Promise<void> {
    return this.assignments.remove(id);
  }

  @Post(':id/codes')
  @ApiOperation({ summary: 'Bir martalik kirish kodlari generatsiyasi (perUser yoki count)' })
  @ApiResponse({ status: 400, description: 'Rejim noto‘g‘ri (aynan bittasi) yoki maqsad yo‘q' })
  generateCodes(@Param('id') id: string, @Body() dto: GenerateCodesDto): Promise<AccessCode[]> {
    return this.assignments.generateCodes(id, dto);
  }

  @Get(':id/codes')
  @ApiOperation({ summary: 'Tayinlov kodlari ro‘yxati' })
  listCodes(@Param('id') id: string): Promise<AccessCode[]> {
    return this.assignments.listCodes(id);
  }
}
