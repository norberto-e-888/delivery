import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import cookieParser from 'cookie-parser';

import { AppModule } from './app/app.module';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());

  const configService = app.get(ConfigService<Config>);
  const { port } = configService.get<Config['misc']>('misc');

  await app.listen(port);

  Logger.log(`🚀 Users service is running on: http://localhost:${port}`);
}

bootstrap();
