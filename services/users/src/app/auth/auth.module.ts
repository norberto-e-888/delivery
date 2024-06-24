import { Module } from '@nestjs/common';
import { AppJwtModule, AppRedisModule } from '@delivery/providers';

import { AuthService } from './auth.service';

@Module({
  imports: [AppJwtModule, AppRedisModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
