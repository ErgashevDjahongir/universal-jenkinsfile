import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
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
import { CreateInterviewQuestionDto } from './dto/create-interview-question.dto';
import { InterviewQuestionFilterDto } from './dto/interview-question-filter.dto';
import { UpdateInterviewQuestionDto } from './dto/update-interview-question.dto';
import { InterviewQuestion } from './entities/interview-question.entity';
import { InterviewQuestionsService } from './interview-questions.service';

/**
 * Suhbat savollari — admin yozadi, ekspert faqat o'qiydi.
 * Class darajasida EXPERT ham ruxsat oladi; yozish metodlarida
 * @Roles(ADMIN, SUPER_ADMIN) ekspertni server tomonida bloklaydi.
 */
@ApiTags('interview-questions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
@Controller('interview-questions')
export class InterviewQuestionsController {
  constructor(private readonly service: InterviewQuestionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suhbat savoli yaratish (faqat admin)' })
  @ApiResponse({ status: 201, description: 'Savol yaratildi' })
  create(
    @Body() dto: CreateInterviewQuestionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<InterviewQuestion> {
    return this.service.create(dto, { userId: user.id, ip });
  }

  @Get()
  @ApiOperation({ summary: "Suhbat savollari ro'yxati (yo'nalish filtri + qidiruv)" })
  @ApiResponse({ status: 200, description: "Savollar ro'yxati" })
  findAll(@Query() filter: InterviewQuestionFilterDto): Promise<InterviewQuestion[]> {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Suhbat savoli batafsil' })
  @ApiResponse({ status: 404, description: 'Savol topilmadi' })
  findOne(@Param('id') id: string): Promise<InterviewQuestion> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suhbat savolini tahrirlash (faqat admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewQuestionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<InterviewQuestion> {
    return this.service.update(id, dto, { userId: user.id, ip });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Suhbat savolini o'chirish (faqat admin)" })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Ip() ip: string): Promise<void> {
    return this.service.remove(id, { userId: user.id, ip });
  }
}
