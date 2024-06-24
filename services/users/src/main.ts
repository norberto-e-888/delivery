import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app/app.module';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService<Config>);
  const { port } = configService.get<Config['misc']>('misc');

  Logger.log(`🚀 Users service is running on: http://localhost:${port}`);
}

bootstrap();
