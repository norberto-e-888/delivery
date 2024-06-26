import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  JwtModule,
  PrismaModule,
  RabbitMQModule,
  RedisModule,
  SendgridModule,
} from '@delivery/providers';
import { OutboxPrismaModule } from '@delivery/outbox-prisma';
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
    PrismaModule.forRootAsync({
      inject: [ConfigService],
      PrismaService,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return {
          databaseUrl: url,
        };
      },
    }),
    OutboxPrismaModule,
    JwtModule,
    RedisModule,
    RabbitMQModule.forRoot(UsersTopic),
    SendgridModule,
    AuthModule,
    VerificationModule,
  ],
})
export class AppModule {}
