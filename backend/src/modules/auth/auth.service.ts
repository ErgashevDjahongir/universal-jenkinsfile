import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '../../common/enums/user-status.enum';
import { messages } from '../../i18n/uz';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './services/password.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthUser } from './types/auth-user.interface';
import { JwtPayload } from './types/jwt-payload.interface';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  /** Ketma-ket noto'g'ri parol urinishlari chegarasi (TZ §3). */
  static readonly MAX_FAILED_ATTEMPTS = 5;
  /** Chegaradan oshganda bloklash muddati (daqiqa). */
  static readonly LOCK_MINUTES = 15;

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateCredentials(dto.login, dto.password);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const rotated = await this.refreshTokens.rotate(refreshToken);
    if (!rotated) {
      throw new UnauthorizedException(messages.auth.sessionExpired);
    }
    const user = await this.users.findById(rotated.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.refreshTokens.revokeOwned(rotated.token, rotated.userId);
      throw new UnauthorizedException(messages.auth.sessionExpired);
    }
    const accessToken = await this.signAccessToken(user);
    return { accessToken, refreshToken: rotated.token, user: this.toAuthUser(user) };
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    await this.refreshTokens.revokeOwned(refreshToken, userId);
  }

  /**
   * Login + parolni tekshiradi; blok hisoblagichini boshqaradi.
   * Foydalanuvchini sanab chiqishni oldini olish uchun xato xabarlari umumiy
   * va topilmagan loginda ham bcrypt vaqti sarflanadi (timing oracle yopiq).
   */
  private async validateCredentials(login: string, password: string): Promise<User> {
    const user = await this.users.findByLogin(login);
    if (!user) {
      await this.passwords.compareDummy(password);
      throw new UnauthorizedException(messages.auth.invalidCredentials);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(messages.auth.accountLocked);
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException(messages.auth.accountLocked);
    }
    if (user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      await this.passwords.compareDummy(password);
      throw new UnauthorizedException(messages.auth.invalidCredentials);
    }

    const matches = await this.passwords.compare(password, user.passwordHash);
    if (!matches) {
      // Atomik: hisoblagichni oshiradi, chegarada bloklaydi. Javob umumiy.
      await this.users.registerFailedAttempt(
        user.id,
        AuthService.MAX_FAILED_ATTEMPTS,
        AuthService.LOCK_MINUTES,
      );
      throw new UnauthorizedException(messages.auth.invalidCredentials);
    }

    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.users.save(user);
    return user;
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.refreshTokens.issue(user.id);
    return { accessToken, refreshToken, user: this.toAuthUser(user) };
  }

  private signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = { sub: user.id, login: user.login, role: user.role };
    return this.jwt.signAsync(payload);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
