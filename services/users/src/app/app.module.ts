import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppOutboxPostgresModule } from '@delivery/outbox-postgres';
import {
  AppJwtModule,
  AppRabbitMQModule,
  AppRedisModule,
  AppSendgridModule,
} from '@delivery/providers';
import { UsersTopic } from '@delivery/api';

import { loadConfig } from '../config';
import { AppPrismaModule } from '../prisma';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AppPrismaModule,
    AppOutboxPostgresModule,
    AppJwtModule,
    AppRedisModule,
    AppRabbitMQModule.forRoot(UsersTopic),
    AppSendgridModule,
    AuthModule,
    VerificationModule,
  ],
})
export class AppModule {}
