import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import { REDIS, Redis, SENDGRID, Sendgrid } from '@delivery/providers';
import { UsersAuthSignUpEventPayload, UsersTopic } from '@delivery/api';
import { RabbitMQMessage } from '@delivery/utils';

import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { inspect } from 'util';
import { Channel, ConsumeMessage } from 'amqplib';

import { PrismaService } from '../../prisma';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @Inject(SENDGRID)
    private readonly sendgrid: Sendgrid,
    @Inject(REDIS)
    private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection
  ) {}

  @RabbitSubscribe({
    exchange: '',
    routingKey: '', // the default exchange is of type direct, so this routing key does nothing but it helps to make the logs from '@golevelup/nestjs-rabbitmq' prettier
    queue: '_retry',
  })
  async retry(message: RabbitMQMessage) {
    try {
      this.logger.debug('retrying message', message);
      this.amqp.channel.sendToQueue(
        message.meta.originalQueue,
        Buffer.from(JSON.stringify(message))
      );
    } catch (error) {
      this.logger.error(
        'Error processing message for queue "retry":',
        inspect(error)
      );
    }
  }

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: '#',
    queue: 'users.verification.send-verification-email',
    errorHandler: async (
      channel: Channel,
      msg: ConsumeMessage,
      error: unknown
    ) => {
      console.error(
        'Error processing message for queue "users.verification.send-verification-email":',
        inspect(error)
      );

      channel.nack(msg, false, false);

      const payloadString = msg.content.toString();
      const message = JSON.parse(payloadString) as RabbitMQMessage;

      if (!message.meta) {
        message.meta = {
          baseDelay: 1000,
          maxRetries: 4,
          originalQueue: 'users.verification.send-verification-email',
          retryCount: 1,
        };
      } else {
        message.meta.retryCount += 1;
      }

      if (message.meta.retryCount > message.meta.maxRetries) {
        console.error(
          `Message for queue "${message.meta.originalQueue}" has reached max retries. Moving to dead letter exchange.`
        );

        const deadLetterName = '_dead-letter-users-service';

        await channel.assertQueue(deadLetterName);

        channel.sendToQueue(
          deadLetterName,
          Buffer.from(JSON.stringify(message))
        );

        return;
      }

      console.log(message);

      const messageTtl = message.meta.baseDelay * 2 ** message.meta.retryCount;
      const delayedQueueName = `_delayed-${messageTtl}`;

      await channel.assertQueue(delayedQueueName, {
        deadLetterExchange: '',
        deadLetterRoutingKey: '_retry',
        messageTtl,
      });

      channel.sendToQueue(
        delayedQueueName,
        Buffer.from(JSON.stringify(message))
      );
    },
  })
  protected async sendVerificationEmail(
    message: RabbitMQMessage<UsersAuthSignUpEventPayload>
  ) {
    const {
      payload: {
        user: { email, id },
      },
    } = message;

    const token = uuid().slice(0, 6);
    const hashedToken = await bcrypt.hash(token, 10);

    await this.redis.set(`email-verification-token:${id}`, hashedToken, {
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
