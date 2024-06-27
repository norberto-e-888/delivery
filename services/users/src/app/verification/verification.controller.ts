import {
  UsersVerificationVerifyEmailBody,
  UsersModule,
  UsersVerificationEndpoint,
} from '@delivery/api';
import { AccessTokenPayload, IsLoggedIn } from '@delivery/auth';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { VerificationService } from './verification.service';

@UseGuards(IsLoggedIn)
@Controller(UsersModule.Verification)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post(UsersVerificationEndpoint.VerifyEmail)
  async handleVerifyEmail(
    @AccessTokenPayload() atp: AccessTokenPayload,
    @Body() body: UsersVerificationVerifyEmailBody
  ) {
    return this.verificationService.verifyEmail({
      userId: atp.id,
      token: body.token,
    });
  }
}
