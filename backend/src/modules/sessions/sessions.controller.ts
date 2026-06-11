import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/types/auth-user.interface';
import { PreviewSessionDto } from './dto/preview-session.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionsService, SessionView, StartSessionResult } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

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

  @Post('preview')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sinov (preview) sessiyasi — faqat admin (qaror §3)' })
  @ApiResponse({ status: 201, description: 'Sinov sessiyasi ochildi (statistikaga kirmaydi)' })
  preview(
    @Body() dto: PreviewSessionDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<SessionView> {
    return this.sessions.startPreview(dto, user, { ip, userAgent });
  }
}
