import { inspect } from 'util';

import {
  UsersAuthSignUpEventPayload,
  UsersQueue,
  UsersTopic,
} from '@delivery/api';
import { REDIS, Redis, SENDGRID, Sendgrid } from '@delivery/providers';
import { RabbitMQMessage } from '@delivery/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { PrismaService } from '../prisma';
import { rabbitMQErrorHandler } from '../rabbitmq-error-handler';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @Inject(SENDGRID)
    private readonly sendgrid: Sendgrid,
    @Inject(REDIS)
    private readonly redis: Redis,
    private readonly prisma: PrismaService
  ) {}

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: '',
    queue: UsersQueue.SendEmailVerification,
    errorHandler: rabbitMQErrorHandler({
      queue: UsersQueue.SendEmailVerification,
    }),
  })
  protected async _sendEmailVerification(
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
    const user = await this.prisma.extended.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new HttpException(
        'User not found when attempting to send email verification',
        HttpStatus.NOT_FOUND
      );
    }

    const { email } = user;
    const token = uuid().slice(0, 6);
    const hashedToken = await bcrypt.hash(token, 12);

    await this.redis.set(`email-verification-token:${userId}`, hashedToken, {
      EX: 60 * 60 * 24,
    });

    this.logger.log(`Sending email verification to ${email}`);

    await this.sendgrid.send({
      from: 'norberto.e.888@gmail.com',
      to: email,
      subject: 'Email Verification',
      text: `Your token: ${token}\n Valid for 24 hours.`,
    });
  }

  async verifyEmail(dto: { userId: string; token: string }) {
    const { userId, token } = dto;
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

    const updatedUser = await this.prisma.extended.user.update({
      where: {
        id: userId,
      },
      data: {
        isEmailVerified: true,
      },
    });

    this.redis
      .del(`email-verification-token:${userId}`)
      .then(() => {
        this.logger.verbose(`Deleted email-verification-token:${userId}`);
      })
      .catch((error) => {
        this.logger.warn(
          `Error deleting email-verification-token:${userId}\n`,
          inspect(error)
        );
      });

    return updatedUser;
  }
}
