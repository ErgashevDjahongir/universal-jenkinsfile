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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { Candidate } from './entities/candidate.entity';
import {
  CandidateAssignmentResult,
  CandidateAssignmentView,
  CandidateDetail,
  CandidateDocumentView,
  CandidateListRow,
  CandidatesService,
  UploadedDocument,
} from './candidates.service';
import { AssignCandidateDto } from './dto/assign-candidate.dto';
import { CandidateFilterDto } from './dto/candidate-filter.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateAssignmentDto } from './dto/update-candidate-assignment.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

/**
 * Test topshiruvchilar (candidates) — administrator boshqaruvi va ekspert ko'rishi.
 * Class darajasida ekspert ham ruxsat oladi; har bir YOZISH metodida (POST/PATCH/DELETE)
 * `@Roles(ADMIN, SUPER_ADMIN)` ekspertni server tomonida bloklaydi (read-only).
 */
@ApiTags('candidates')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test topshiruvchi qo‘shish (F.I.Sh. + telefon)' })
  @ApiResponse({ status: 201, description: 'Topshiruvchi yaratildi' })
  create(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<Candidate> {
    return this.candidates.create(dto, { userId: user.id, ip });
  }

  @Get()
  @ApiOperation({ summary: 'Topshiruvchilar ro‘yxati (holat filtri, F.I.Sh. qidiruv)' })
  findAll(
    @Query() filter: CandidateFilterDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CandidateListRow[]> {
    const effectiveFilter =
      user.role === UserRole.EXPERT ? { ...filter, hasAssignment: true } : filter;
    return this.candidates.findAll(effectiveFilter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Topshiruvchi kartochkasi (ma’lumot + hujjatlar + tayinlov + natija)' })
  @ApiResponse({ status: 404, description: 'Topshiruvchi topilmadi' })
  findOne(@Param('id') id: string): Promise<CandidateDetail> {
    return this.candidates.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Topshiruvchi ma’lumotlarini tahrirlash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<Candidate> {
    return this.candidates.update(id, dto, { userId: user.id, ip });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Topshiruvchini o‘chirish (hujjatlari bilan; audit)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser, @Ip() ip: string): Promise<void> {
    return this.candidates.remove(id, { userId: user.id, ip });
  }

  // ---- Hujjatlar ----

  @Post(':id/documents/:docType')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  // limits: multer faylni xotiraga to'liq yuklashdan oldin 10 MB da uzadi (memory DoS himoyasi).
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'PDF hujjat yuklash yoki almashtirish (recommendation/reference/application)',
  })
  @ApiResponse({ status: 400, description: 'Fayl PDF emas yoki hajmi katta' })
  uploadDocument(
    @Param('id') id: string,
    @Param('docType') docType: string,
    @UploadedFile() file: UploadedDocument | undefined,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<CandidateDocumentView> {
    return this.candidates.uploadDocument(id, docType, file, { userId: user.id, ip });
  }

  @Delete(':id/documents/:docType')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hujjatni o‘chirish' })
  removeDocument(
    @Param('id') id: string,
    @Param('docType') docType: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<void> {
    return this.candidates.removeDocument(id, docType, { userId: user.id, ip });
  }

  @Get(':id/documents/:docType/download')
  @ApiOperation({ summary: 'Hujjatni yuklab olish (admin va ekspert; himoyalangan)' })
  @ApiResponse({ status: 200, description: 'PDF fayl oqimi' })
  @ApiResponse({ status: 404, description: 'Hujjat topilmadi' })
  async downloadDocument(
    @Param('id') id: string,
    @Param('docType') docType: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<StreamableFile> {
    const { document, absolutePath } = await this.candidates.getDocumentForDownload(id, docType, {
      userId: user.id,
      ip,
    });
    const filename = encodeURIComponent(document.originalName);
    return new StreamableFile(createReadStream(absolutePath), {
      type: 'application/pdf',
      disposition: `attachment; filename*=UTF-8''${filename}`,
    });
  }

  // ---- Tayinlov ----

  @Post(':id/assignment')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Tayinlov biriktirish + bir martalik kod (bitta topshiruvchi = bitta tayinlov)',
  })
  @ApiResponse({ status: 400, description: 'Allaqachon tayinlangan yoki shablon faol emas' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCandidateDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<CandidateAssignmentResult> {
    return this.candidates.assign(id, dto, { userId: user.id, ip });
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tayinlovni tahrirlash (faqat sessiya ochilmagan bo‘lsa)' })
  @ApiResponse({ status: 400, description: 'Test boshlangan — tahrirlab bo‘lmaydi' })
  updateAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateAssignmentDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ): Promise<CandidateAssignmentView> {
    return this.candidates.updateAssignment(id, dto, { userId: user.id, ip });
  }
}
