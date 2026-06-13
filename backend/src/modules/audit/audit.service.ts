import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

/** Bitta audit yozuvi uchun kirish ma'lumotlari. */
export interface AuditEntry {
  /** Amalni bajargan foydalanuvchi (mavjud bo'lsa). */
  userId?: string | null;
  /** `entity.amal` ko'rinishidagi amal nomi, masalan `candidate.create`. */
  action: string;
  /** Tegishli entity nomi (jadval), masalan `candidate`. */
  entity?: string | null;
  /** Entity birlamchi kaliti. */
  entityId?: string | null;
  /** Qo'shimcha kontekst (o'zgargan maydonlar, fayl turi va h.k.). */
  details?: Record<string, unknown> | null;
  /** So'rov IP manzili. */
  ip?: string | null;
}

/**
 * O'zgartiruvchi amallarni `audit_log` jadvaliga yozadi.
 * Audit yozuvi asosiy amalni hech qachon buzmaydi — xatolik faqat log qilinadi.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity ?? null,
          entityId: entry.entityId ?? null,
          details: entry.details ?? null,
          ipAddress: entry.ip ?? null,
        }),
      );
    } catch (error) {
      // Audit yozuvidagi nosozlik asosiy amalni to'xtatmasligi kerak.
      this.logger.error(`Audit yozib bo'lmadi (${entry.action})`, error as Error);
    }
  }
}
