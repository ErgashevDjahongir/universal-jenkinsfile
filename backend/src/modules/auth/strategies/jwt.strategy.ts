import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../../config/configuration';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { messages } from '../../../i18n/uz';
import { UsersService } from '../../users/users.service';
import { AuthUser } from '../types/auth-user.interface';
import { JwtPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret', { infer: true }),
    });
  }

  /** Tokendagi sub bo'yicha foydalanuvchini yuklaydi va faolligini tekshiradi. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(messages.auth.sessionExpired);
    }
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
