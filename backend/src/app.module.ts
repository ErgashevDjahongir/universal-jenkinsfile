import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { dataSourceOptions } from './config/data-source';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { RedisModule } from './modules/redis/redis.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SettingsModule } from './modules/settings/settings.service';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    // dataSourceOptions process.env'dan o'qiydi; ConfigModule .env'ni shu yerga yuklaydi.
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    RedisModule,
    SettingsModule,
    UsersModule,
    AuthModule,
    SubjectsModule,
    QuestionsModule,
    TemplatesModule,
    AssignmentsModule,
    SessionsModule,
    HealthModule,
  ],
  providers: [
    // Global tartib: avval autentifikatsiya (JwtAuthGuard), keyin rol tekshiruvi (RolesGuard).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
