import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../../modules/auth/types/auth-user.interface';

/** Joriy autentifikatsiya qilingan foydalanuvchini (JwtStrategy.validate natijasi) qaytaradi. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);
