import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { messages } from '../../i18n/uz';
import { AuthUser } from '../auth/types/auth-user.interface';
import { CreateQuestionDto } from './dto/create-question.dto';
import { QuestionFilterDto } from './dto/question-filter.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Question } from './entities/question.entity';
import { QuestionAttachment } from './entities/question-attachment.entity';
import { QuestionsService, UploadedImage } from './questions.service';

@ApiTags('questions')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Savol yaratish (draft)' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthUser): Promise<Question> {
    return this.questions.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Savollar ro‘yxati (filtrlar bilan)' })
  findAll(@Query() filter: QuestionFilterDto, @CurrentUser() user: AuthUser): Promise<Question[]> {
    return this.questions.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Savol ma’lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<Question> {
    return this.questions.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Savolni tahrirlash (arxivlangan emas; ekspert faqat o‘z draftini)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Question> {
    return this.questions.update(id, dto, user);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Savolni tasdiqlash (draft → approved; faqat admin)' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<Question> {
    return this.questions.approve(id, user);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Savolni faollashtirish (approved → active)' })
  activate(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<Question> {
    return this.questions.activate(id, user);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Savolni arxivlash (→ archived; yangi testga tushmaydi)' })
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<Question> {
    return this.questions.archive(id, user);
  }

  @Post(':id/attachments')
  // limits: multer faylni to'liq xotiraga yuklashdan oldin 2 MB da uzadi (memory DoS himoyasi).
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Savolga rasm biriktirish (png/jpg, maks 2 MB)' })
  @ApiResponse({ status: 201, description: 'Rasm biriktirildi' })
  addAttachment(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImage | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionAttachment> {
    if (!file) {
      throw new BadRequestException(messages.common.validationFailed);
    }
    return this.questions.addAttachment(id, file, user);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'Savol rasmlari ro‘yxati' })
  listAttachments(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<QuestionAttachment[]> {
    return this.questions.listAttachments(id, user);
  }
}
