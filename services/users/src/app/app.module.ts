import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { config } from '../config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    AuthModule,
  ],
})
export class AppModule {}
