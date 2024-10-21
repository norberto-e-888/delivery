import {
  UsersAuthSignUpEventPayload,
  UsersQueue,
  UsersTopic,
} from '@delivery/api';
import { RabbitMQMessage } from '@delivery/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma';
import { rabbitMQErrorHandler } from '../rabbitmq-error-handler';
import { TokenService } from '../token/token.service';

const VERIFY_EMAIL_KEY = 'verify-email';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService
  ) {}

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: '',
    queue: UsersQueue.SendEmailVerificationOnSignUp,
    errorHandler: rabbitMQErrorHandler({
      queue: UsersQueue.SendEmailVerificationOnSignUp,
    }),
  })
  protected async sendEmailVerificationOnSignUp(
    message: RabbitMQMessage<UsersAuthSignUpEventPayload>
  ) {
    const {
      payload: {
        user: { id },
      },
    } = message;

    await this.sendEmailVerification(id);
  }

  @RabbitSubscribe({
    exchange: UsersTopic.EmailChanged,
    routingKey: '',
    queue: UsersQueue.SendEmailVerificationOnEmailChange,
    errorHandler: rabbitMQErrorHandler({
      queue: UsersQueue.SendEmailVerificationOnEmailChange,
    }),
  })
  protected async sendEmailVerificationOnEmailChange(
    message: RabbitMQMessage<UsersAuthSignUpEventPayload>
  ) {
    const {
      payload: {
        user: { id },
      },
    } = message;

    await this.sendEmailVerification(id);
  }

  async sendEmailVerification(userId: string) {
    await this.tokenService.sendToken(userId, {
      actionKey: VERIFY_EMAIL_KEY,
      subject: 'Email Verification',
      text: 'Your token: <TOKEN> Valid for 24 hours.',
      expiresInMinutes: 60 * 24,
      maxAttempts: 3,
    });
  }

  async verifyEmail(dto: { userId: string; token: string }) {
    const { userId, token } = dto;

    await this.tokenService.validateToken(userId, VERIFY_EMAIL_KEY, token);

    const updatedUser = await this.prisma.extended.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailVerified: true,
      },
    });

    return updatedUser;
  }
}
