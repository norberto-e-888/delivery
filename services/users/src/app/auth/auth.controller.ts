import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import {
  UsersAuthEndpoint,
  UsersModule,
  UsersAuthSignInBody,
  UsersAuthSignUpBody,
} from '@delivery/api';
import { AccessTokenPayload, IsLoggedIn, JwtCookie } from '@delivery/auth';
import { Cookie } from '@delivery/utils';

import { Response, CookieOptions } from 'express';

import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: +process.env.AUTH_JWT_REFRESH_TOKEN_DURATION * 1000,
};

@Controller(UsersModule.Auth)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService
  ) {}

  @Post(UsersAuthEndpoint.SignUp)
  async handleSignUp(
    @Body() body: UsersAuthSignUpBody,
    @Res({ passthrough: true }) res: Response
  ) {
    const { tokens, user } = await this.authService.signUp(body);

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }

  @Post(UsersAuthEndpoint.SignIn)
  async handleSignIn(
    @Body() body: UsersAuthSignInBody,
    @Res({ passthrough: true }) res: Response
  ) {
    const { tokens, user } = await this.authService.signIn(body);

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }

  @UseGuards(IsLoggedIn)
  @Post(UsersAuthEndpoint.SignOut)
  async handleSignOut(
    @Res({ passthrough: true }) res: Response,
    @AccessTokenPayload() atp: AccessTokenPayload,
    @Cookie(JwtCookie.RefreshToken) refreshToken: string
  ) {
    await this.authService.signOutFromSingleDevice(atp.id, refreshToken);

    res.clearCookie(JwtCookie.AccessToken, COOKIE_OPTIONS);
    res.clearCookie(JwtCookie.RefreshToken, COOKIE_OPTIONS);

    return {
      message: 'Successfully signed out',
    };
  }

  @UseGuards(IsLoggedIn)
  @Post(UsersAuthEndpoint.Refresh)
  async handleRefresh(
    @Res({ passthrough: true }) res: Response,
    @AccessTokenPayload() atp: AccessTokenPayload,
    @Cookie(JwtCookie.RefreshToken) refreshToken: string
  ) {
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refreshTokens(atp.id, refreshToken);

    res.cookie(JwtCookie.AccessToken, accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, newRefreshToken, COOKIE_OPTIONS);

    return {
      message: 'Successfully refreshed tokens',
    };
  }

  @UseGuards(IsLoggedIn)
  @Get(UsersAuthEndpoint.Me)
  async handleMe(@AccessTokenPayload() atp: AccessTokenPayload) {
    const user = await this.prisma.findUserById(atp.id);

    delete user.password;

    return {
      user,
    };
  }
}
