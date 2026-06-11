import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Endpoint'ni global JwtAuthGuard'dan ozod qiladi (auth talab qilinmaydi). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
