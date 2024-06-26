import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  JwtModule,
  AppPrismaModule,
  AppRabbitMQModule,
  AppRedisModule,
  AppSendgridModule,
} from '@delivery/providers';
import { AppOutboxPrismaModule } from '@delivery/outbox-prisma';
import { UsersTopic } from '@delivery/api';

import { Config, loadConfig } from '../config';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';
import { PrismaService } from '../prisma';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AppPrismaModule.forRootAsync({
      inject: [ConfigService],
      PrismaService,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return {
          databaseUrl: url,
        };
      },
    }),
    AppOutboxPrismaModule,
    JwtModule,
    AppRedisModule,
    AppRabbitMQModule.forRoot(UsersTopic),
    AppSendgridModule,
    AuthModule,
    VerificationModule,
  ],
})
export class AppModule {}
