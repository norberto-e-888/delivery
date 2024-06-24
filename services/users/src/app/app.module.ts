import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AppJwtModule,
  AppMongoModule,
  AppRedisModule,
  AppSendgridModule,
} from '@delivery/providers';
import { User, UserSchema } from '@delivery/models';

import { loadConfig } from '../config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AppJwtModule,
    AppMongoModule,
    AppRedisModule,
    AppSendgridModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    AuthModule,
  ],
})
export class AppModule {}
