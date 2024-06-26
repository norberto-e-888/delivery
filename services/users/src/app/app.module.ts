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
import { EmailVerificationService } from './email-verification.service';
import { AuthService } from './auth.service';
import { AppPrismaModule } from '../prisma';

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
  ],
  providers: [AuthService, EmailVerificationService],
})
export class AppModule {}
