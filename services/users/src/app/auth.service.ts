import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  UsersEventSignUpPayload,
  UsersSignInBody,
  UsersSignUpBody,
  UsersTopic,
  usersEventSignUpRoutingKeyGenerators,
} from '@delivery/api';
import { USERS_COLLECTION, User } from '@delivery/models';
import { OutboxService } from '@delivery/outbox';
import {
  AccessTokenPayload,
  REDIS_PROVIDER_KEY,
  RedisProviderType,
} from '@delivery/providers';

import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { Config } from '../config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(REDIS_PROVIDER_KEY)
    private readonly redis: RedisProviderType,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Config>,
    private readonly outboxService: OutboxService
  ) {}

  async signUp(dto: UsersSignUpBody): Promise<AuthenticatedResponse> {
    const newUser = await this.outboxService.publish(
      async (session) => {
        const existingUser = await this.userModel.findOne({
          email: dto.email,
        });

        if (existingUser) {
          throw new HttpException(
            'User already exists',
            HttpStatus.BAD_REQUEST
          );
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const [newUser] = await this.userModel.create(
          {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            password: hashedPassword,
          },
          {
            session,
          }
        );

        return newUser.toObject();
      },
      {
        exchange: UsersTopic.SignUp,
        routingKey: usersEventSignUpRoutingKeyGenerators.producer(),
      },
      {
        transformPayload: (user): UsersEventSignUpPayload => ({
          user,
        }),
        aggregate: {
          collection: USERS_COLLECTION,
          entityIdKey: 'user.id',
        },
      }
    );

    return {
      user: newUser,
      tokens: await this.generateTokens(newUser),
    };
  }

  async signIn(dto: UsersSignInBody): Promise<AuthenticatedResponse> {
    const existingUser = await this.userModel.findOne({
      email: dto.email,
    });

    if (!existingUser) {
      throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      existingUser.password
    );

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
    }

    const existingUserObj = existingUser.toObject();

    return {
      user: existingUserObj,
      tokens: await this.generateTokens(existingUserObj),
    };
  }

  async signOutFromSingleDevice(
    user: User,
    refreshToken: string
  ): Promise<void> {
    const hashedRefreshTokens = await this.redis.zRange(
      `refresh-tokens:${user.id}`,
      0,
      -1
    );

    for (const token of hashedRefreshTokens) {
      const isTokenValid = await bcrypt.compare(refreshToken, token);

      if (isTokenValid) {
        await this.redis.zRem(`refresh-tokens:${user.id}`, token);
        return;
      }
    }
  }

  async signOutFromAllDevices(user: User): Promise<void> {
    await this.redis.del(`refresh-tokens:${user.id}`);
  }

  async refreshTokens(user: User, refreshToken: string): Promise<Tokens> {
    const hashedRefreshTokens = await this.redis.zRange(
      `refresh-tokens:${user.id}`,
      0,
      -1
    );

    for (const token of hashedRefreshTokens) {
      const isTokenValid = token && (await bcrypt.compare(refreshToken, token));

      if (isTokenValid) {
        return this.generateTokens(user, token);
      }
    }

    /**
     * If we made it here, it means the same refresh token was used more than once, which never happens for legitimate users.
     */

    await this.signOutFromAllDevices(user);

    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    this.redis.set(`compromised-user:${user.id}`, 1, {
      EX: accessTokenDuration,
    });
  }

  private async generateTokens(
    user: User,
    currentSessionHashedToken?: string
  ): Promise<Tokens> {
    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    const maxSessions = this.configService.get<number>('maxSessions');

    const payload: AccessTokenPayload = {
      id: user.id,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenDuration,
    });

    const refreshToken = uuid();
    const token = await bcrypt.hash(refreshToken, 10);

    await this.redis.watch(`refresh-tokens:${user.id}`);

    const multi = this.redis.multi();

    multi.zAdd(`refresh-tokens:${user.id}`, {
      score: Date.now(),
      value: token,
    });

    if (currentSessionHashedToken) {
      multi.zRem(`refresh-tokens:${user.id}`, currentSessionHashedToken);
    }

    const numberOfSessions = await this.redis.zCard(
      `refresh-tokens:${user.id}`
    );

    if (numberOfSessions === maxSessions) {
      multi.zPopMin(`refresh-tokens:${user.id}`);
    }

    await multi.exec();

    return {
      accessToken,
      refreshToken,
    };
  }
}

export type AuthenticatedResponse = {
  user: User;
  tokens: Tokens;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};
