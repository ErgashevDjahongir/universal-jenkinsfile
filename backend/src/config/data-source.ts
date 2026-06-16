import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// TypeORM CLI (migration:run/generate/revert) shu fayldan DataSource oladi.
// Ilova ichida esa AppModule TypeOrmModule.forRootAsync orqali shu sozlamalardan foydalanadi.
loadEnv();

export const dataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'etest',
  password: process.env.DB_PASSWORD ?? 'etest_dev_password',
  database: process.env.DB_NAME ?? 'etest',
  // Entity'lar modullar bilan birga qo'shiladi (keyingi bosqichlar).
  entities: [__dirname + '/../modules/**/entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  // Migratsiyalar qo'lda boshqariladi; sxema hech qachon avtomatik sinxronlanmaydi.
  synchronize: false,
  migrationsRun: false,
  // Ulanish hovuzi — productionda ~100 bir vaqtdagi foydalanuvchi uchun (env orqali).
  extra: {
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
  },
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
} satisfies DataSourceOptions;

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
