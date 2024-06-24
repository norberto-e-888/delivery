import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppOutboxModule } from '@delivery/outbox';
import {
  AppJwtModule,
  AppMongoModule,
  AppRabbitMQModule,
  AppRedisModule,
  AppSendgridModule,
} from '@delivery/providers';
import { UsersTopic } from '@delivery/api';

import { loadConfig } from '../config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AppRabbitMQModule.forRoot(Object.values(UsersTopic)),
    AppOutboxModule,
    AppJwtModule,
    AppMongoModule,
    AppRedisModule,
    AppSendgridModule,
    AuthModule,
  ],
})
export class AppModule {}
