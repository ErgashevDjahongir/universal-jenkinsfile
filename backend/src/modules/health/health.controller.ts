import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Tizim holatini tekshirish (liveness + DB ulanishi)' })
  @ApiResponse({ status: 200, description: 'Tizim ishlamoqda' })
  async check(): Promise<{ status: string; database: string; timestamp: string }> {
    let database = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: 'ok',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
