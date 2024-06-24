import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { loadConfig } from '../config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    AuthModule,
  ],
})
export class AppModule {}
