import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app/app.module';
import { Config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Config>);

  const { port } = configService.get<Config['misc']>('misc');

  Logger.log(`🚀 Users service is running on: http://localhost:${port}`);
}

bootstrap();
