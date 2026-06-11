import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const queryMock = jest.fn();

  beforeEach(async () => {
    queryMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: { query: queryMock } as Partial<DataSource>,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('DB ulanishi muvaffaqiyatli bo‘lsa database=up qaytaradi', async () => {
    queryMock.mockResolvedValueOnce([{ '?column?': 1 }]);
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('DB ulanishi uzilgan bo‘lsa database=down qaytaradi', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'));
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('down');
  });
});
