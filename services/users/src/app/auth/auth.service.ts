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
import { USERS_COLLECTION, User, UserRole } from '@delivery/models';
import { OutboxService } from '@delivery/outbox';
import { REDIS_PROVIDER_KEY, RedisProvierType } from '@delivery/providers';

import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { Config } from '../../config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @Inject(REDIS_PROVIDER_KEY)
    private readonly redis: RedisProvierType,
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
    const { refreshTokenSecret } =
      this.configService.get<Config['auth']>('auth');

    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      refreshTokenSecret
    );

    await this.redis.del(`refresh-token:${user.id}:${hashedRefreshToken}`);
  }

  async signOutFromAllDevices(user: User): Promise<void> {
    const keys = await this.redis.keys(`refresh-token:${user.id}:*`);
    const multi = this.redis.multi();
    for (const key of keys) {
      multi.del(key);
    }

    await multi.exec();
  }

  async refreshTokens(user: User, refreshToken: string): Promise<Tokens> {
    const { refreshTokenSecret } =
      this.configService.get<Config['auth']>('auth');

    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      refreshTokenSecret
    );

    const refreshTokenKey = `refresh-token:${user.id}:${hashedRefreshToken}`;
    const tokenUsage = await this.redis.incr(refreshTokenKey);

    if (tokenUsage !== 1) {
      await this.redis.sAdd('compromised-users', user.id);
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<Tokens> {
    const payload: {
      id: string;
      roles: UserRole[];
    } = {
      id: user.id,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '10m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '90d' });
    const { refreshTokenSecret } =
      this.configService.get<Config['auth']>('auth');

    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      refreshTokenSecret
    );

    await this.redis.set(`refresh-token:${user.id}:${hashedRefreshToken}`, 0, {
      EX: 60 * 60 * 24 * 90,
    });

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
