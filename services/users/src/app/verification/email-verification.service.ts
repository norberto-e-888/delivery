import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  REDIS,
  RedisProviderType,
  SENDGRID,
  SendgridProviderType,
} from '@delivery/providers';
import { UsersAuthSignUpEventPayload, UsersTopic } from '@delivery/api';
import { RMQMessage } from '@delivery/utils';
import { PRISMA } from '@delivery/providers';
import { PrismaClient } from '@prisma/users';

import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { inspect } from 'util';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(SENDGRID)
    private readonly sendgrid: SendgridProviderType,
    @Inject(REDIS)
    private readonly redis: RedisProviderType,
    @Inject(PRISMA)
    private readonly prisma: PrismaClient
  ) {}

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: '#',
    queue: 'users.send-email-verification',
  })
  protected async sendEmailVerification(
    message: RMQMessage<UsersAuthSignUpEventPayload>
  ) {
    try {
      this.logger.log(
        `Sending email verification to ${message.data.user.email}`
      );

      const {
        data: {
          user: { email, id },
        },
      } = message;

      const token = uuid().slice(0, 6);
      const hashedToken = await bcrypt.hash(token, 10);

      await this.redis.set(`email-verification-token:${id}`, hashedToken, {
        EX: 60 * 60 * 24,
      });

      await this.sendgrid.send({
        from: 'norberto.e.888@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Your token: ${token}\n Valid for 24 hours.`,
      });
    } catch (error) {
      console.log('Error with sendEmailVerification:', inspect(error));
    }
  }

  async verifyEmail(userId: string, token: string) {
    const hashedToken = await this.redis.get(
      `email-verification-token:${userId}`
    );

    if (!hashedToken) {
      throw new HttpException(
        'Token expired. Please request a new one.',
        HttpStatus.BAD_REQUEST
      );
    }

    const isTokenValid = await bcrypt.compare(token, hashedToken);

    if (!isTokenValid) {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailVerified: true,
      },
    });

    delete updatedUser.password;

    this.redis
      .del(`email-verification-token:${userId}`)
      .then(() => {
        console.log(`Deleted email-verification-token:${userId}`);
      })
      .catch((error) => {
        console.log(
          `Error deleting email-verification-token:${userId}\n`,
          inspect(error)
        );
      });

    return updatedUser;
  }
}
