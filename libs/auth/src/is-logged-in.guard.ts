import { REDIS, Redis } from '@delivery/providers';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SystemRole } from '@prisma/users';
import { Request } from 'express';

@Injectable()
export class IsLoggedIn implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(REDIS)
    private readonly redis: Redis
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

      const roles = this.reflector.get(SystemRoles, context.getHandler());

      if (roles && !roles.some((role) => role === payload.role)) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      request.atp = payload;
    } catch (error) {
      throw new HttpException('Invalid access token', HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}

export const SystemRoles = Reflector.createDecorator<SystemRole[]>();

export const AccessTokenPayload = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AppRequest>();
    return request.atp;
  }
);

export enum JwtCookie {
  AccessToken = 'accessToken',
  RefreshToken = 'refreshToken',
}

export type AccessTokenPayload = {
  id: string;
  role: SystemRole;
  isEmailVerified: boolean;
};

export type AppRequest = Request & { atp: AccessTokenPayload };
