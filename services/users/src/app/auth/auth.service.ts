import { randomBytes } from 'crypto';

import {
  UsersAuthSignUpEventPayload,
  UsersAuthSignInBody,
  UsersAuthSignUpBody,
  UsersTopic,
  UsersAuthRecoverPasswordBody,
  UsersAuthChangeEmailBody,
  UsersAuthValidateMagicLinkBody,
} from '@delivery/api';
import { AccessTokenPayload } from '@delivery/auth';
import { OutboxService } from '@delivery/outbox';
import { REDIS, Redis, SENDGRID, Sendgrid } from '@delivery/providers';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/users';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { RedisKeysFactory } from '../../utils';
import { Config } from '../config';
import { PrismaService } from '../prisma';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(REDIS)
    private readonly redis: Redis,
    @Inject(SENDGRID)
    private readonly sendgrid: Sendgrid,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Config>,
    private readonly outboxService: OutboxService<PrismaService>,
    private readonly prisma: PrismaService
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
    refreshToken: string
  ): Promise<void> {
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

  async recoverPassword(
    dto: UsersAuthRecoverPasswordBody
  ): Promise<AuthenticatedResponse> {
    const user = await this.prisma.extended.user
      .findUniqueOrThrow({
        where: {
          email: dto.email,
        },
      })
      .catch(() => {
        throw new HttpException(
          'No user with that email exists on our system',
          HttpStatus.NOT_FOUND
        );
      });

    const passwordRecoveryCodeKey = RedisKeysFactory.passwordRecoveryCode(
      user.email
    );

    const hashedRecoveryCode = await this.redis.get(passwordRecoveryCodeKey);
    if (!hashedRecoveryCode) {
      throw new HttpException(
        'Password recovery flow is not active for this user',
        HttpStatus.BAD_REQUEST
      );
    }

    const isCodeValid = await bcrypt.compare(dto.code, hashedRecoveryCode);

    if (!isCodeValid) {
      throw new HttpException('Invalid code', HttpStatus.FORBIDDEN);
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.extended.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: newHashedPassword,
      },
    });

    this.redis
      .del(passwordRecoveryCodeKey)
      .then(() => {
        this.logger.verbose(`Password recovery code deleted for ${dto.email}`);
      })
      .catch(() => {
        this.logger.verbose(
          `Failed to delete password recovery code deleted for ${dto.email}`
        );
      });

    return {
      user,
      tokens: await this.generateTokens(user),
    };
  }

  async sendPasswordRecovery(email: string): Promise<void> {
    const user = await this.prisma.extended.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return;
    }

    const code = uuid().slice(0, 6);
    const hashedCode = await bcrypt.hash(code, 12);

    await this.redis.set(
      RedisKeysFactory.passwordRecoveryCode(user.email),
      hashedCode
    );

    await this.sendgrid.send({
      from: 'norberto.e.888@gmail.com',
      to: email,
      subject: 'Password recovery',
      text: `Use this code: ${code} to set a new password`,
    });
  }

  async changeEmail(
    userId: string,
    dto: UsersAuthChangeEmailBody
  ): Promise<AuthenticatedResponse> {
    const { updatedUser } = await this.outboxService.publish(
      async (prisma) => {
        const user = await prisma.extended.user
          .findUniqueOrThrow({
            where: {
              id: userId,
            },
          })
          .catch(() => {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
          });

        const existingUser = await prisma.extended.user.findUnique({
          where: {
            email: dto.newEmail,
          },
        });

        if (existingUser) {
          throw new HttpException(
            `${dto.newEmail} is already taken`,
            HttpStatus.BAD_REQUEST
          );
        }

        const updatedUser = await prisma.extended.user.update({
          where: {
            id: user.id,
          },
          data: {
            email: dto.newEmail,
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

    const user = await this.prisma.extended.user.findUnique({
      where: {
        id: userId,
      },
    });

    return {
      user,
      tokens: await this.generateTokens(user),
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
      roles: user.roles,
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
}

export type AuthenticatedResponse = {
  user: Omit<User, 'password'>;
  tokens: Tokens;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};
