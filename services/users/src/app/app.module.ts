import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AppJwtModule,
  AppMongoModule,
  AppRedisModule,
} from '@delivery/providers';

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
    AuthModule,
  ],
})
export class AppModule {}
