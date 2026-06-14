import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { AccessCode } from '../assignments/entities/access-code.entity';
import { PreviewSessionDto } from './dto/preview-session.dto';
import { SessionFilterDto } from './dto/session-filter.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import {
  ExamineeSessionView,
  MonitorRow,
  SessionResultView,
  SessionsService,
  SessionView,
  StartSessionResult,
} from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // ---- topshiruvchi (examinee) ----

  @Public()
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kod orqali kirish va sessiya ochish (token qaytaradi)' })
  @ApiResponse({ status: 200, description: 'Token juftligi va sessiya xulosasi' })
  @ApiResponse({ status: 400, description: 'Kod noto‘g‘ri/ishlatilgan yoki oyna yopiq' })
  @ApiResponse({ status: 409, description: 'Sizda allaqachon faol sessiya bor' })
  start(
    @Body() dto: StartSessionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<StartSessionResult> {
    return this.sessions.startByCode(dto, { ip, userAgent });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sessiya holati va savollar (to‘g‘ri javoblarsiz; refresh tiklash)' })
  @ApiResponse({ status: 403, description: 'Begona sessiya' })
  getSession(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ExamineeSessionView> {
    return this.sessions.getExamineeSession(id, user.id);
  }

  @Post(':id/begin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Testni boshlash — taymerni shu lahzada ishga tushiradi (server vaqti)',
  })
  @ApiResponse({ status: 200, description: 'Sessiya in_progress; savollar va qoldiq vaqt' })
  @ApiResponse({ status: 400, description: 'Sessiya boshlash uchun tayyor emas yoki oyna yopiq' })
  @ApiResponse({ status: 403, description: 'Begona sessiya' })
  begin(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<ExamineeSessionView> {
    return this.sessions.beginSession(id, user.id);
  }

  @Post(':id/answers/:sessionQuestionId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Javobni darhol saqlash' })
  @ApiResponse({ status: 400, description: 'Vaqt tugagan yoki sessiya faol emas' })
  @ApiResponse({ status: 403, description: 'Begona sessiya' })
  submitAnswer(
    @Param('id') id: string,
    @Param('sessionQuestionId') sessionQuestionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ saved: true }> {
    return this.sessions.submitAnswer(id, sessionQuestionId, dto, user.id);
  }

  @Post(':id/tab-switch')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tab almashtirishni qayd etish (limitdan oshsa avtoyakun)' })
  recordTabSwitch(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ tabSwitches: number; terminated: boolean }> {
    return this.sessions.recordTabSwitch(id, user.id);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sessiyani yakunlash (baholash; immutable)' })
  finish(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<SessionResultView> {
    return this.sessions.finishByExaminee(id, user.id);
  }

  // ---- admin ----

  @Post('preview')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sinov (preview) sessiyasi — faqat admin (qaror §3)' })
  preview(
    @Body() dto: PreviewSessionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<SessionView> {
    return this.sessions.startPreview(dto, user, { ip, userAgent });
  }

  @Get()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
  @ApiOperation({ summary: 'Jonli monitoring (standart: faol sessiyalar)' })
  monitor(@Query() filter: SessionFilterDto): Promise<MonitorRow[]> {
    return this.sessions.monitor(filter);
  }

  @Get(':id/review')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.EXPERT)
  @ApiOperation({ summary: 'Admin/ekspert tahlili: har savol, berilgan va to‘g‘ri javob' })
  review(@Param('id') id: string): Promise<unknown> {
    return this.sessions.adminGetSession(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sessiyani bekor qilish (void; urinishga kirmaydi)' })
  cancel(@Param('id') id: string): Promise<SessionResultView> {
    return this.sessions.cancelSession(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sessiyani majburan to‘xtatish (mavjud javoblar baholanadi)' })
  terminate(@Param('id') id: string): Promise<SessionResultView> {
    return this.sessions.terminateSession(id);
  }

  @Post(':id/allow-retry')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qayta topshirishga ruxsat (yangi kirish kodi)' })
  allowRetry(@Param('id') id: string): Promise<AccessCode> {
    return this.sessions.allowRetry(id);
  }
}
