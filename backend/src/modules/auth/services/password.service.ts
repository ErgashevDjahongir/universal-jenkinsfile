import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AppConfig } from '../../../config/configuration';

/** Parol xeshlash — faqat bcrypt (cost sozlamadan, minimal 12). Qaror §11.2. */
@Injectable()
export class PasswordService {
  /** Loyiha qoidasi: bcrypt cost hech qachon 12 dan past bo'lmaydi (CLAUDE.md). */
  static readonly MIN_COST = 12;

  private readonly cost: number;
  /** Foydalanuvchi topilmaganda timing'ni tenglashtirish uchun (enumeration himoyasi). */
  private readonly dummyHash: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const configured = config.get('bcryptCost', { infer: true });
    this.cost = Math.max(configured, PasswordService.MIN_COST);
    this.dummyHash = bcrypt.hashSync('etest_dummy_password', this.cost);
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Foydalanuvchi mavjud bo'lmaganda chaqiriladi: haqiqiy compare bilan bir xil
   * hisoblash vaqtini sarflaydi, shunda javob vaqti orqali login mavjudligini
   * aniqlab bo'lmaydi. Natija har doim e'tiborsiz qoldiriladi.
   */
  async compareDummy(plain: string): Promise<void> {
    await bcrypt.compare(plain, this.dummyHash);
  }
}
