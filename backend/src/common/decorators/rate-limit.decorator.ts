import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Oyna ichidagi maksimal so'rovlar soni. */
  limit: number;
  /** Oyna uzunligi (soniya). */
  windowSeconds: number;
}

/** Endpoint'ga IP bo'yicha sodda rate-limit qo'yadi (RateLimitGuard tekshiradi). */
export const RateLimit = (limit: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds } satisfies RateLimitOptions);
