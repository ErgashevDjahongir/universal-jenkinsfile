/**
 * Markazlashgan konfiguratsiya: muhit o’zgaruvchilarini tiplangan obyektga yig’adi.
 * `@nestjs/config` orqali `ConfigService` bilan o’qiladi.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  session: {
    idleMinutes: number;
  };
  bcryptCost: number;
}

export default (): AppConfig => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET env o’zgaruvchisi o’rnatilmagan. .env faylini tekshiring.');
  }
  if (jwtSecret === 'change_me_in_production') {
    // eslint-disable-next-line no-console
    console.warn('[XAVFSIZLIK] JWT_SECRET hali ham standart qiymatda — production uchun kuchli kalit o’rnating.');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'etest',
      password: process.env.DB_PASSWORD ?? 'etest_dev_password',
      name: process.env.DB_NAME ?? 'etest',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    },
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    },
    session: {
      idleMinutes: parseInt(process.env.SESSION_IDLE_MINUTES ?? '30', 10),
    },
    bcryptCost: parseInt(process.env.BCRYPT_COST ?? '12', 10),
  };
};
