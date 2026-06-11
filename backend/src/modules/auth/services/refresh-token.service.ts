import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { AppConfig } from '../../../config/configuration';
import { REDIS_CLIENT } from '../../redis/redis.constants';

/**
 * Refresh token holatini Redis'da boshqaradi (sliding session, qaror §11).
 * Kalit: `auth:refresh:<token>` = userId, TTL = harakatsizlik oynasi (30 daq).
 * Har rotatsiyada eski token o'chiriladi, yangisi to'liq TTL bilan yaratiladi —
 * shu sababli faol foydalanuvchi sessiyasi cho'ziladi, 30 daq harakatsizlikda o'chadi.
 */
@Injectable()
export class RefreshTokenService {
  private readonly ttlSeconds: number;
  private static readonly PREFIX = 'auth:refresh:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<AppConfig, true>,
  ) {
    this.ttlSeconds = config.get('session.idleMinutes', { infer: true }) * 60;
  }

  private key(token: string): string {
    return `${RefreshTokenService.PREFIX}${token}`;
  }

  /** Yangi refresh token yaratadi va Redis'ga TTL bilan yozadi. */
  async issue(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(this.key(token), userId, 'EX', this.ttlSeconds);
    return token;
  }

  /**
   * Eski tokenni tekshiradi va aylantiradi (rotation). Amal qilmasa null.
   * GETDEL atomik — bir tokendan parallel ikki rotatsiya ikki token yarata olmaydi
   * (faqat bittasi userId oladi, ikkinchisi null). Muvaffaqiyatda yangi token
   * TTL'i to'liq 30 daq'ga tiklanadi.
   */
  async rotate(oldToken: string): Promise<{ token: string; userId: string } | null> {
    const userId = await this.redis.getdel(this.key(oldToken));
    if (!userId) {
      return null;
    }
    const token = await this.issue(userId);
    return { token, userId };
  }

  /**
   * Refresh tokenni faqat egasi (userId) bekor qila oladi — boshqa foydalanuvchi
   * tokenini o'chirib sessiyasini uzib yuborishning oldini oladi.
   */
  async revokeOwned(token: string, userId: string): Promise<void> {
    const owner = await this.redis.get(this.key(token));
    if (owner === userId) {
      await this.redis.del(this.key(token));
    }
  }
}
