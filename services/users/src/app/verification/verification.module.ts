import { Module } from '@nestjs/common';

import { TokenModule } from '../token/token.module';

import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [TokenModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
