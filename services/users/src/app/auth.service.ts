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
import { REDIS_PROVIDER_KEY, RedisProviderType } from '@delivery/providers';

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

  async signOut(user: User): Promise<void> {
    await this.redis.del(`refresh-token:${user.id}`);
  }

  async refreshTokens(user: User, refreshToken: string): Promise<Tokens> {
    const hashedRefreshToken = await this.redis.get(`refresh-token:${user.id}`);
    const isTokenValid =
      hashedRefreshToken &&
      (await bcrypt.compare(refreshToken, hashedRefreshToken));

    if (!isTokenValid) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<Tokens> {
    const payload: AccessTokenPayload = {
      id: user.id,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '10m' });
    const refreshToken = uuid();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.redis.set(`refresh-token:${user.id}`, hashedRefreshToken, {
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

export type AccessTokenPayload = {
  id: string;
  roles: UserRole[];
};
