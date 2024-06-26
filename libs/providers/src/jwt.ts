import {
  Global,
  Module,
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { UserRole } from '@prisma/users';

import Joi from 'joi';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { AppRedisModule, REDIS, RedisProviderType } from './redis';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(REDIS)
    private readonly redis: RedisProviderType
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const accessToken = request.cookies[JwtCookie.AccessToken];

    if (!accessToken) {
      throw new HttpException(
        'Access token not found',
        HttpStatus.UNAUTHORIZED
      );
    }

    const refreshToken = request.cookies[JwtCookie.RefreshToken];
    const isRefreshEndpoint =
      request.method === 'POST' && request.url === '/auth/refresh';

    if (isRefreshEndpoint && !refreshToken) {
      throw new HttpException(
        'Refresh token not found',
        HttpStatus.UNAUTHORIZED
      );
    }

    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(accessToken, {
        ignoreExpiration: isRefreshEndpoint,
      });

      const expiryOverride = await this.redis.get(
        `consider-all-tokens-expired:${payload.id}`
      );

      if (expiryOverride) {
        throw new HttpException(
          'Invalid access token',
          HttpStatus.UNAUTHORIZED
        );
      }

      const roles = this.reflector.get(Roles, context.getHandler());

      if (roles && !roles.some((role) => payload.roles.includes(role))) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      request.atp = payload;
    } catch (error) {
      throw new HttpException('Invalid access token', HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get<JwtConfig['jwt']>('jwt');

        if (!jwtConfig) {
          throw new Error('Expected to find jwt configuration under key "jwt"');
        }

        const { secret, accessTokenDuration } = jwtConfig;

        return {
          secret,
          signOptions: {
            expiresIn: accessTokenDuration,
          },
        };
      },
    }),
    AppRedisModule,
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}

export const Roles = Reflector.createDecorator<UserRole[]>();

export const AccessTokenPayload = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    return request.atp;
  }
);

export const jwtConfigJoiSchema = Joi.object<JwtConfig>({
  jwt: Joi.object<JwtConfig['jwt']>({
    secret: Joi.string().required().length(64),
    accessTokenDuration: Joi.number()
      .integer()
      .min(60)
      .max(60 * 15),
    refreshTokenDuration: Joi.number()
      .integer()
      .min(60 * 60 * 24)
      .max(60 * 60 * 24 * 90),
  }).required(),
});

export enum JwtCookie {
  AccessToken = 'accessToken',
  RefreshToken = 'refreshToken',
}

export type JwtConfig = {
  jwt: {
    secret: string;
    accessTokenDuration: number;
    refreshTokenDuration: number;
  };
};

export type AccessTokenPayload = {
  id: string;
  roles: UserRole[];
};

export type AppRequest = Request & { atp: AccessTokenPayload };
