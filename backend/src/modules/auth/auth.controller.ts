import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, AuthResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthUser } from './types/auth-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login va parol orqali kirish' })
  @ApiResponse({ status: 200, description: 'Access va refresh token qaytariladi' })
  @ApiResponse({ status: 401, description: 'Login/parol noto‘g‘ri yoki hisob bloklangan' })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token orqali yangi access token olish' })
  @ApiResponse({ status: 200, description: 'Yangi token juftligi' })
  @ApiResponse({ status: 401, description: 'Refresh token amal qilmaydi (muddati tugagan)' })
  refresh(@Body() dto: RefreshDto): Promise<AuthResult> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chiqish — refresh tokenni bekor qilish' })
  @ApiResponse({ status: 204, description: 'Sessiya yakunlandi' })
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken, user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy foydalanuvchi ma’lumotlari' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi konteksti' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
