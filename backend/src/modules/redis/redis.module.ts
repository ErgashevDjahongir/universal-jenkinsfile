import { Global, Inject, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>): Redis =>
    new Redis({
      host: config.get('redis.host', { infer: true }),
      port: config.get('redis.port', { infer: true }),
      maxRetriesPerRequest: 3,
    }),
};

/** Global ioredis mijozi. REDIS_CLIENT tokeni bilan inject qilinadi. */
@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
