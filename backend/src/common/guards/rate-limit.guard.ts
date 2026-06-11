import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import Redis from 'ioredis';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { REDIS_CLIENT } from '../../modules/redis/redis.constants';

/**
 * @RateLimit(limit, windowSeconds) bilan belgilangan endpoint'lar uchun IP
 * bo'yicha sobit oynali rate-limit (Redis INCR + EXPIRE). Ommaviy (auth'siz)
 * endpoint'larni (masalan /verify) suiiste'moldan himoyalaydi.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler().name;
    const ip = request.ip ?? 'unknown';
    const key = `rl:${handler}:${ip}`;

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, options.windowSeconds);
    }
    if (count > options.limit) {
      throw new HttpException('So‘rovlar soni chegaradan oshdi', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
