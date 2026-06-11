import { Global, Injectable, Module } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { SystemSetting } from './entities/system-setting.entity';

type DefaultPoints = Record<DifficultyLevel, number>;

const FALLBACK_POINTS: DefaultPoints = {
  [DifficultyLevel.EASY]: 1,
  [DifficultyLevel.MEDIUM]: 2,
  [DifficultyLevel.HARD]: 3,
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
  ) {}

  async get(key: string): Promise<unknown> {
    const row = await this.settings.findOne({ where: { key } });
    return row?.value;
  }

  /**
   * Qiyinlik bo'yicha standart ball (system_settings.default_question_points).
   * Sozlama yo'q/buzilgan bo'lsa xavfsiz fallback (1/2/3) qaytadi.
   */
  async getDefaultPoints(difficulty: DifficultyLevel): Promise<number> {
    const value = await this.get('default_question_points');
    if (value && typeof value === 'object') {
      const candidate = (value as Record<string, unknown>)[difficulty];
      if (typeof candidate === 'number' && candidate > 0) {
        return candidate;
      }
    }
    return FALLBACK_POINTS[difficulty];
  }
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
