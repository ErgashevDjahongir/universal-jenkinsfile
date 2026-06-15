import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CandidatesService } from './candidates.service';

/**
 * Tayinlov muddati o'tganda candidate holatini avtomatik yangilaydi (TZ §G).
 * Har 5 daqiqada ishlaydi; biznes-logika {@link CandidatesService.reconcileExpiredCandidates}
 * da — ro'yxat so'ralganda ham xuddi shu metod chaqiriladi (ikki yoqlama ishonchlilik).
 */
@Injectable()
export class CandidateStatusScheduler {
  private readonly logger = new Logger(CandidateStatusScheduler.name);

  constructor(private readonly candidates: CandidatesService) {}

  @Cron('*/5 * * * *', { name: 'candidate-status-expire' })
  async expireCandidates(): Promise<void> {
    const count = await this.candidates.reconcileExpiredCandidates();
    if (count > 0) {
      this.logger.log(`${count} ta topshiruvchi holati avtomatik yangilandi`);
    }
  }
}
