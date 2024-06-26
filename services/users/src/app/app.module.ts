import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@delivery/models';
import { AppOutboxPostgresModule } from '@delivery/outbox-postgres';
import {
  AppJwtModule,
  AppMongoModule,
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
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    AppPrismaModule,
    AppOutboxPostgresModule,
    AppJwtModule,
    AppMongoModule,
    AppRedisModule,
    AppRabbitMQModule.forRoot(UsersTopic),
    AppSendgridModule,
  ],
  providers: [AuthService, EmailVerificationService],
})
export class AppModule {}
