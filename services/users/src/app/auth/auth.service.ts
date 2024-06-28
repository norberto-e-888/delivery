import {
  UsersAuthSignUpEventPayload,
  UsersAuthSignInBody,
  UsersAuthSignUpBody,
  UsersTopic,
} from '@delivery/api';
import { AccessTokenPayload } from '@delivery/auth';
import { OutboxPrismaService } from '@delivery/outbox-prisma';
import { REDIS, Redis } from '@delivery/providers';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/users';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { Config } from '../config';
import { PrismaService } from '../prisma';

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Config>,
    private readonly outboxPrismaService: OutboxPrismaService<PrismaService>,
    private readonly prisma: PrismaService
  ) {}

  async signUp(dto: UsersAuthSignUpBody): Promise<AuthenticatedResponse> {
    const { user } =
      await this.outboxPrismaService.publish<UsersAuthSignUpEventPayload>(
        async (prisma) => {
          const existingUser = await prisma.extended.user.findUnique({
            where: {
              email: dto.email,
            },
            select: {
              id: true,
            },
          });

          if (existingUser) {
            throw new HttpException(
              'User already exists',
              HttpStatus.BAD_REQUEST
            );
          }

          const hashedPassword = await bcrypt.hash(dto.password, 12);
          const user = await prisma.extended.user.create({
            data: {
              name: dto.name,
              email: dto.email,
              password: hashedPassword,
            },
          });

          return {
            user,
          };
        },
        {
          exchange: UsersTopic.SignUp,
        }
      );

    return {
      user,
      tokens: await this.generateTokens(user),
    };
  }

  async signIn(dto: UsersAuthSignInBody): Promise<AuthenticatedResponse> {
    const existingUser = await this.prisma.extended.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!existingUser) {
      throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
    }

    const userWithPassword = await this.prisma.user
      .findUniqueOrThrow({
        where: {
          id: existingUser.id,
        },
        select: {
          password: true,
        },
      })
      .catch(() => {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      });

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      userWithPassword.password
    );

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
    }

    return {
      user: existingUser,
      tokens: await this.generateTokens(existingUser),
    };
  }

  async signOutFromSingleDevice(
    userId: string,
    refreshToken: string
  ): Promise<void> {
    const hashedRefreshTokens = await this.redis.zRange(
      `refresh-tokens:${userId}`,
      0,
      -1
    );

    for (const token of hashedRefreshTokens) {
      const isTokenValid = await bcrypt.compare(refreshToken, token);

      if (isTokenValid) {
        await this.redis.zRem(`refresh-tokens:${userId}`, token);
        return;
      }
    }
  }

  async signOutFromAllDevices(userId: string): Promise<void> {
    await this.redis.del(`refresh-tokens:${userId}`);
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const hashedRefreshTokens = await this.redis.zRange(
      `refresh-tokens:${userId}`,
      0,
      -1
    );

    for (const token of hashedRefreshTokens) {
      const isTokenValid = token && (await bcrypt.compare(refreshToken, token));

      if (isTokenValid) {
        const user = await this.prisma.extended.user
          .findUniqueOrThrow({
            where: {
              id: userId,
            },
          })
          .catch(() => {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
          });

        return this.generateTokens(
          {
            id: user.id,
            roles: user.roles,
          },
          token
        );
      }
    }

    /**
     * If we made it here, it means the same refresh token was used more than once, which never happens for legitimate users.
     */

    await this.signOutFromAllDevices(userId);

    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    this.redis.set(`consider-all-tokens-expired:${userId}`, 1, {
      EX: accessTokenDuration,
    });
  }

  private async generateTokens(
    atp: AccessTokenPayload,
    currentSessionHashedToken?: string
  ): Promise<Tokens> {
    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    const maxSessions = this.configService.get<number>('maxSessions');

    const accessToken = this.jwtService.sign(atp, {
      expiresIn: accessTokenDuration,
    });

    const refreshToken = uuid();
    const token = await bcrypt.hash(refreshToken, 12);

    await this.redis.watch(`refresh-tokens:${atp.id}`);

    const multi = this.redis.multi();

    multi.zAdd(`refresh-tokens:${atp.id}`, {
      score: Date.now(),
      value: token,
    });

    if (currentSessionHashedToken) {
      multi.zRem(`refresh-tokens:${atp.id}`, currentSessionHashedToken);
    }

    const numberOfSessions =
      (await this.redis.zCard(`refresh-tokens:${atp.id}`)) +
      (currentSessionHashedToken ? 0 : 1);

    if (numberOfSessions > maxSessions) {
      multi.zPopMin(`refresh-tokens:${atp.id}`);
    }

    await multi.exec();

    return {
      accessToken,
      refreshToken,
    };
  }
}

export type AuthenticatedResponse = {
  user: Omit<User, 'password'>;
  tokens: Tokens;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};
