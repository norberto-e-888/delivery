import { Service, UsersTopic } from '@delivery/api';
import { OutboxPrismaModule } from '@delivery/outbox-prisma';
import {
  JwtModule,
  PrismaModule,
  RabbitMQModule,
  RedisModule,
  SendgridModule,
} from '@delivery/providers';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { Config, loadConfig } from './config';
import { PrismaService } from './prisma';
import { VerificationModule } from './verification/verification.module';

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
    RabbitMQModule.forRoot({
      service: Service.Users,
      topics: UsersTopic,
    }),
    SendgridModule,
    AuthModule,
    VerificationModule,
  ],
})
export class AppModule {}
