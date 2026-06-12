import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);

  const corsOrigin = config.get('corsOrigin', { infer: true });
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const apiPrefix = config.get('apiPrefix', { infer: true });
  app.setGlobalPrefix(apiPrefix);

  // Barcha DTO'lar uchun global validatsiya: noma'lum maydonlarni rad etadi.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Swagger / OpenAPI hujjatlari — /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-TEST API')
    .setDescription('Test platformasi REST API hujjatlari')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = config.get('port', { infer: true });
  await app.listen(port);
}

void bootstrap();
