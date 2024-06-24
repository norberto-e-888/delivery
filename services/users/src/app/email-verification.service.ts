import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import {
  REDIS_PROVIDER_KEY,
  RedisProviderType,
  SENDGRID_PROVIDER_KEY,
  SendgridProviderType,
} from '@delivery/providers';
import { UsersEventSignUpPayload, UsersTopic } from '@delivery/api';
import { User } from '@delivery/models';

import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { inspect } from 'util';

@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(SENDGRID_PROVIDER_KEY)
    private readonly sendgrid: SendgridProviderType,
    @Inject(REDIS_PROVIDER_KEY)
    private readonly redis: RedisProviderType,
    @InjectModel(User.name)
    private readonly userModel: Model<User>
  ) {}

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: '#',
    queue: 'users.send-email-verification',
  })
  protected async sendEmailVerification(data: UsersEventSignUpPayload) {
    try {
      const {
        user: { email, id },
      } = data;

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

  async verifyEmailToken(userId: string, token: string) {
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

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        isEmailVerified: true,
      },
      { new: true }
    );

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

    return updatedUser.toObject();
  }
}
