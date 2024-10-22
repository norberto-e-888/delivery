import { randomBytes } from 'crypto';

import {
  UsersTopic,
  UsersAuthSignUpEventPayload,
  UsersAuthSignInBody,
  UsersAuthSignUpBody,
  UsersAuthChangeEmailBody,
  UsersAuthValidateMagicLinkBody,
  UsersAuthUpdatePasswordBody,
} from '@delivery/api';
import { AccessTokenPayload } from '@delivery/auth';
import { OutboxService } from '@delivery/outbox';
import { REDIS, Redis, SENDGRID, Sendgrid } from '@delivery/providers';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/users';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { RedisKeysFactory } from '../../utils';
import { Config } from '../config';
import { PrismaService } from '../prisma';
import { TokenService } from '../token/token.service';

const CREATE_PASSWORD_KEY = 'update-password';
const CHANGE_EMAIL_KEY = 'change-email';

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
    @Inject(SENDGRID)
    private readonly sendgrid: Sendgrid,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Config>,
    private readonly outboxService: OutboxService<PrismaService>,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService
  ) {}

  async signUp(dto: UsersAuthSignUpBody): Promise<AuthenticatedResponse> {
    const { user } =
      await this.outboxService.publish<UsersAuthSignUpEventPayload>(
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
    const existingUserWithPassword = await this.prisma.user
      .findUniqueOrThrow({
        where: {
          email: dto.email,
        },
      })
      .catch(() => {
        throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
      });

    if (!existingUserWithPassword.password) {
      throw new HttpException(
        "You haven't configured a password yet, as it seems you created your account with a magic link",
        HttpStatus.BAD_REQUEST
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      existingUserWithPassword.password
    );

    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.NOT_FOUND);
    }

    // this is the only place where we have to worry about manually deleting the password from the user object
    // as our linting rule only allows this.prisma.user to be accessed in the context of AuthService.signIn
    delete existingUserWithPassword.password;

    return {
      user: existingUserWithPassword,
      tokens: await this.generateTokens(existingUserWithPassword),
    };
  }

  async signOutFromSingleDevice(
    userId: string,
    {
      refreshToken,
      accessToken,
    }: {
      refreshToken: string;
      accessToken: string;
    }
  ): Promise<void> {
    await this.redis.sAdd(
      RedisKeysFactory.tokensBlacklist(userId),
      accessToken
    );

    const refreshTokenKey = RedisKeysFactory.refreshTokens(userId);
    const hashedRefreshTokens = await this.redis.zRange(refreshTokenKey, 0, -1);

    for (const token of hashedRefreshTokens) {
      const isTokenValid = await bcrypt.compare(refreshToken, token);

      if (isTokenValid) {
        await this.redis.zRem(refreshTokenKey, token);
        return;
      }
    }
  }

  async signOutFromAllDevices(userId: string): Promise<void> {
    const multi = this.redis.multi();

    multi.del(RedisKeysFactory.refreshTokens(userId));

    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    multi.set(RedisKeysFactory.tokenExpiryOverride(userId), 1, {
      EX: accessTokenDuration,
    });

    await multi.exec();
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<Tokens> {
    const hashedRefreshTokens = await this.redis.zRange(
      RedisKeysFactory.refreshTokens(userId),
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

        return this.generateTokens(user, token);
      }
    }

    /**
     * If we made it here, it means the same refresh token was used more than once, which never happens for legitimate users.
     */

    await this.signOutFromAllDevices(userId);
  }

  async createMagicLink(email: string): Promise<void> {
    let user = await this.prisma.extended.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.extended.user.create({
        data: {
          email,
        },
      });
    }

    const token = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 12);
    await this.redis.set(RedisKeysFactory.magicLink(user.id), hashedToken, {
      EX: 60 * 5, // expires in 5 minutes
    });

    const link = `http://localhost:3000/auth/magic-link?token=${token}&userId=${user.id}`;
    await this.sendgrid.send({
      from: 'norberto.e.888@gmail.com',
      to: email,
      subject: 'Your Magic Link',
      text: `Click here to log in: ${link}`,
    });
  }

  async validateMagicLink(
    dto: UsersAuthValidateMagicLinkBody
  ): Promise<AuthenticatedResponse> {
    const { userId, token } = dto;
    const hashedToken = await this.redis.getDel(
      RedisKeysFactory.magicLink(userId)
    );

    if (!hashedToken) {
      throw new HttpException('Invalid magic link', HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(token, hashedToken);
    if (!isMatch) {
      throw new HttpException('Invalid magic link', HttpStatus.NOT_FOUND);
    }

    let user = await this.prisma.extended.user
      .findUniqueOrThrow({
        where: {
          id: userId,
        },
      })
      .catch(() => {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      });

    if (!user.isEmailVerified) {
      user = await this.prisma.extended.user.update({
        where: {
          id: userId,
        },
        data: {
          isEmailVerified: true,
        },
      });

      // we need to invalidate all current live tokens to trigger a refresh on all of the user's sessions so they get the
      // updated isEmailVerified flag in their ATP
      await this.tokenExpiryOverride(user.id);
    }

    return {
      user,
      tokens: await this.generateTokens(user),
    };
  }

  async requestPasswordUpdateToken(userId: string): Promise<void> {
    await this.tokenService.sendToken(userId, {
      actionKey: CREATE_PASSWORD_KEY,
      subject: 'Password Update',
      text: 'Your token: <TOKEN> Valid for 24 hours.',
      expiresInMinutes: 60 * 24,
      maxAttempts: 3,
    });
  }

  async updatePassword(
    userId: string,
    dto: UsersAuthUpdatePasswordBody
  ): Promise<AuthenticatedResponse> {
    const { token, password } = dto;

    await this.tokenService.validateToken(userId, CREATE_PASSWORD_KEY, token);

    const hashedPassword = await bcrypt.hash(password, 12);
    const updatedUser = await this.prisma.extended.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    await this.signOutFromAllDevices(updatedUser.id);

    return {
      tokens: await this.generateTokens(updatedUser),
      user: updatedUser,
    };
  }

  async requestEmailUpdateToken(userId: string): Promise<void> {
    await this.tokenService.sendToken(userId, {
      actionKey: CHANGE_EMAIL_KEY,
      subject: 'Email Change',
      text: 'Your token: <TOKEN> Valid for 24 hours.',
      expiresInMinutes: 60 * 24,
      maxAttempts: 3,
    });
  }

  async updateEmail(
    userId: string,
    dto: UsersAuthChangeEmailBody
  ): Promise<AuthenticatedResponse> {
    const { updatedUser } = await this.outboxService.publish(
      async (prisma) => {
        const existingUser = await prisma.extended.user.findUnique({
          where: {
            email: dto.email,
          },
        });

        if (existingUser) {
          throw new HttpException(
            `${dto.email} is already taken`,
            HttpStatus.BAD_REQUEST
          );
        }

        await this.tokenService.validateToken(
          userId,
          CHANGE_EMAIL_KEY,
          dto.token
        );

        const updatedUser = await prisma.extended.user.update({
          where: {
            id: userId,
          },
          data: {
            email: dto.email,
            isEmailVerified: false,
          },
        });

        return {
          updatedUser,
        };
      },
      {
        exchange: UsersTopic.EmailChanged,
      }
    );

    await this.signOutFromAllDevices(updatedUser.id);

    return {
      user: updatedUser,
      tokens: await this.generateTokens(updatedUser),
    };
  }

  private async generateTokens(
    user: User | Omit<User, 'password'>,
    currentSessionHashedToken?: string
  ): Promise<Tokens> {
    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    const maxSessions = this.configService.get<number>('maxSessions');

    const atp: AccessTokenPayload = {
      id: user.id,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    const accessToken = this.jwtService.sign(atp, {
      expiresIn: accessTokenDuration,
    });

    const refreshToken = uuid();
    const token = await bcrypt.hash(refreshToken, 12);
    const refreshTokenKey = RedisKeysFactory.refreshTokens(atp.id);

    await this.redis.watch(refreshTokenKey);

    const multi = this.redis.multi();

    multi.zAdd(refreshTokenKey, {
      score: Date.now(),
      value: token,
    });

    if (currentSessionHashedToken) {
      multi.zRem(refreshTokenKey, currentSessionHashedToken);
    }

    const numberOfSessions =
      (await this.redis.zCard(refreshTokenKey)) +
      (currentSessionHashedToken ? 0 : 1);

    if (numberOfSessions > maxSessions) {
      multi.zPopMin(refreshTokenKey);
    }

    await multi.exec();

    return {
      accessToken,
      refreshToken,
    };
  }

  private async tokenExpiryOverride(userId: string): Promise<void> {
    const { accessTokenDuration } =
      this.configService.get<Config['jwt']>('jwt');

    await this.redis.set(RedisKeysFactory.tokenExpiryOverride(userId), 1, {
      EX: accessTokenDuration,
    });
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
