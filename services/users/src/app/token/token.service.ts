import { inspect } from 'util';

import { Redis, REDIS, Sendgrid, SENDGRID } from '@delivery/providers';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { RedisKeysFactory } from '../../utils';
import { PrismaService } from '../prisma';

const CHAR_BANK = 'abcdefghijklmnopqrstuvwxyz0123456789';

type TokenAction = {
  hashedToken: string;
  expires: number;
  maxAttempts: number;
  attempts: number;
};

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
    @Inject(SENDGRID)
    private readonly sendgrid: Sendgrid,
    private readonly prisma: PrismaService
  ) {}

  async sendToken(
    userId: string,
    {
      actionKey,
      subject,
      text,
      expiresInMinutes = 60,
      maxAttempts = 3,
    }: {
      actionKey: string;
      subject: string;
      text: string;
      expiresInMinutes?: number;
      maxAttempts?: number;
    }
  ) {
    if (!text.includes('<TOKEN>')) {
      throw Error('Text must include token placeholder <TOKEN>');
    }

    const user = await this.prisma.extended.user
      .findUniqueOrThrow({
        where: {
          id: userId,
        },
      })
      .catch(() => {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      });

    const { token, hashedToken } = await this.generateRandomToken(6);
    const action: TokenAction = {
      hashedToken,
      expires: Date.now() + 1000 * 60 * expiresInMinutes,
      maxAttempts,
      attempts: 0,
    };

    await this.redis.hSet(RedisKeysFactory.tokenActions(userId), [
      actionKey,
      JSON.stringify(action),
    ]);

    this.logger.log(`Sending token for action ${actionKey} to ${user.email}`);

    await this.sendgrid.send({
      from: 'norberto.e.888@gmail.com',
      to: user.email,
      subject,
      text: text.replace('<TOKEN>', token),
    });
  }

  async validateToken(
    userId: string,
    actionKey: string,
    attemptedValue: string
  ) {
    const actionsKey = RedisKeysFactory.tokenActions(userId);
    const tokenActionRaw = await this.redis.hGet(actionsKey, actionKey);

    if (!tokenActionRaw) {
      throw new HttpException(
        `Token action ${actionKey} for user ID ${userId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    const tokenAction: TokenAction = JSON.parse(tokenActionRaw);

    if (tokenAction.expires < Date.now()) {
      throw new HttpException(
        `Token action ${actionKey} for user ID ${userId} has expired`,
        HttpStatus.FORBIDDEN
      );
    }

    if (tokenAction.attempts > tokenAction.maxAttempts) {
      throw new HttpException('Too many attempts', HttpStatus.FORBIDDEN);
    }

    const isAttemptValid = await bcrypt.compare(
      attemptedValue,
      tokenAction.hashedToken
    );

    if (!isAttemptValid) {
      tokenAction.attempts++;

      await this.redis.hSet(actionsKey, [
        actionKey,
        JSON.stringify(tokenAction),
      ]);

      throw new HttpException('Token is incorrect', HttpStatus.FORBIDDEN);
    }

    this.redis
      .hDel(actionsKey, actionKey)
      .then(() => {
        this.logger.verbose(
          `Deleted action ${actionKey} for user ID ${userId}`
        );
      })
      .catch((error) => {
        this.logger.warn(
          `Error deleting action ${actionKey} for user ID ${userId}\n`,
          inspect(error)
        );
      });

    return true;
  }

  private async generateRandomToken(length: number) {
    if (length < 0) {
      throw new Error('Random token length must be greater than zero.');
    }

    let token = '';

    for (let i = 0; i < length; i++) {
      token += CHAR_BANK[Math.random() * CHAR_BANK.length];
    }

    return {
      token,
      hashedToken: await bcrypt.hash(token, 12),
    };
  }
}
