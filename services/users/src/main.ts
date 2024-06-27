import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app/app.module';
import { Config } from './app/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  app.use(cookieParser());

  const configService = app.get(ConfigService<Config>);
  const { port } = configService.get<Config['common']>('common');

  await app.listen(port);

  Logger.log(`🚀 Users service is running on: http://localhost:${port}`);
}

bootstrap();
