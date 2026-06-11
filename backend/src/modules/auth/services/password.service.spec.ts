import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/configuration';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  // Test tezligi uchun past cost; ishlab chiqarishda 12 (qaror §11.2).
  const config = { get: () => 4 } as unknown as ConfigService<AppConfig, true>;
  const service = new PasswordService(config);

  it('xesh ochiq matndan farq qiladi va bcrypt formatida bo‘ladi', async () => {
    const hash = await service.hash('StrongPass1');
    expect(hash).not.toBe('StrongPass1');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('to‘g‘ri parol uchun compare true qaytaradi', async () => {
    const hash = await service.hash('StrongPass1');
    await expect(service.compare('StrongPass1', hash)).resolves.toBe(true);
  });

  it('noto‘g‘ri parol uchun compare false qaytaradi', async () => {
    const hash = await service.hash('StrongPass1');
    await expect(service.compare('WrongPass9', hash)).resolves.toBe(false);
  });
});
