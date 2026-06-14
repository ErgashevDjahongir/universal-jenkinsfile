import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';

/**
 * Vaqt tugashi bo'yicha avtomatik yakunlash kafolati.
 * Har daqiqada deadline o'tib ketgan in_progress sessiyalarni timeout (EXPIRED)
 * sifatida yakunlaydi — topshiruvchi "Yakunlash" bosmasa yoki brauzerni yopib ketsa ham.
 * So'rov vaqtidagi tekshiruv (getExamineeSession) faol foydalanuvchini, bu reja esa
 * tashlab ketilgan sessiyalarni qamrab oladi.
 */
@Injectable()
export class SessionExpiryScheduler {
  private readonly logger = new Logger(SessionExpiryScheduler.name);

  constructor(private readonly sessions: SessionsService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'session-expire' })
  async expireOverdue(): Promise<void> {
    const count = await this.sessions.expireOverdueSessions();
    if (count > 0) {
      this.logger.log(`${count} ta sessiya vaqt tugashi bo'yicha avtomatik yakunlandi`);
    }
  }
}
