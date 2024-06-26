import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppOutboxPostgresModule } from '@delivery/outbox-postgres';
import {
  AppJwtModule,
  AppPrismaModule,
  AppRabbitMQModule,
  AppRedisModule,
  AppSendgridModule,
} from '@delivery/providers';
import { UsersTopic } from '@delivery/api';
import { PrismaClient } from '@prisma/users';

import { Config, loadConfig } from '../config';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AppPrismaModule.forRootAsync({
      inject: [ConfigService],
      PrismaClientClass: PrismaClient,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return {
          databaseUrl: url,
        };
      },
    }),
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
