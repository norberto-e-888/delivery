import {
  UsersAuthEndpoint,
  UsersModule,
  UsersAuthSignInBody,
  UsersAuthSignUpBody,
  UsersAuthSendPasswordRecoveryBody,
  UsersAuthRecoverPasswordBody,
  UsersAuthChangeEmailBody,
  UsersAuthCreateMagicLinkBody,
  UsersAuthValidateMagicLinkBody,
  UsersAuthSignOutQuery,
  UsersAuthCreatePasswordBody,
} from '@delivery/api';
import { AccessTokenPayload, IsLoggedIn, JwtCookie } from '@delivery/auth';
import { Cookie, Environment } from '@delivery/utils';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, CookieOptions } from 'express';

import { PrismaService } from '../prisma';

import { AuthService } from './auth.service';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === Environment.Production,
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
    @Query() query: UsersAuthSignOutQuery,
    @Res({ passthrough: true }) res: Response,
    @AccessTokenPayload() atp: AccessTokenPayload,
    @Cookie(JwtCookie.RefreshToken) refreshToken: string,
    @Cookie(JwtCookie.AccessToken) accessToken: string
  ) {
    if (query.fromAllSessions) {
      await this.authService.signOutFromAllDevices(atp.id);
    } else {
      await this.authService.signOutFromSingleDevice(atp.id, {
        refreshToken,
        accessToken,
      });
    }

    res.clearCookie(JwtCookie.AccessToken, COOKIE_OPTIONS);
    res.clearCookie(JwtCookie.RefreshToken, COOKIE_OPTIONS);

    return {
      message: query.fromAllSessions
        ? 'Successfully signed out from all devices'
        : 'Successfully signed out',
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
    const user = await this.prisma.extended.user
      .findUniqueOrThrow({
        where: {
          id: atp.id,
        },
      })
      .catch(() => {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      });

    return {
      user,
    };
  }

  @Post(UsersAuthEndpoint.SendPasswordRecovery)
  async handleSendPasswordRecovery(
    @Body() body: UsersAuthSendPasswordRecoveryBody
  ) {
    await this.authService.sendPasswordRecovery(body.email);

    return {
      message: `You will receive a recovery code at ${body.email} if said email exists in our system`,
    };
  }

  @Post(UsersAuthEndpoint.RecoverPassword)
  async handleRecoverPassword(
    @Body() body: UsersAuthRecoverPasswordBody,
    @Res({ passthrough: true }) res: Response
  ) {
    const { tokens, user } = await this.authService.recoverPassword(body);

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }

  @UseGuards(IsLoggedIn)
  @Patch(UsersAuthEndpoint.ChangeEmail)
  async handleChangeEmail(
    @Body() body: UsersAuthChangeEmailBody,
    @Res({ passthrough: true }) res: Response,
    @AccessTokenPayload() atp: AccessTokenPayload
  ) {
    const { tokens, user } = await this.authService.changeEmail(atp.id, body);

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }

  @Post(UsersAuthEndpoint.CreateMagicLink)
  async handleCreateMagicLink(@Body() body: UsersAuthCreateMagicLinkBody) {
    await this.authService.createMagicLink(body.email);

    return {
      message: 'Please check your email for the magic link',
    };
  }

  @Post(UsersAuthEndpoint.ValidateMagicLink)
  async handleValidateMagicLink(
    @Body() body: UsersAuthValidateMagicLinkBody,
    @Res({ passthrough: true }) res: Response
  ) {
    const { tokens, user } = await this.authService.validateMagicLink(body);

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }

  @UseGuards(IsLoggedIn)
  @Post(UsersAuthEndpoint.RequestPasswordCreation)
  async handleRequestPasswordCreation(
    @AccessTokenPayload() atp: AccessTokenPayload
  ) {
    await this.authService.requestPasswordCreationToken(atp.id);
  }

  @UseGuards(IsLoggedIn)
  @Patch(UsersAuthEndpoint.CreatePassword)
  async handleCreatePassword(
    @AccessTokenPayload() atp: AccessTokenPayload,
    @Body() body: UsersAuthCreatePasswordBody,
    @Res({ passthrough: true }) res: Response
  ) {
    const { tokens, user } = await this.authService.createPassword(
      atp.id,
      body
    );

    res.cookie(JwtCookie.AccessToken, tokens.accessToken, COOKIE_OPTIONS);
    res.cookie(JwtCookie.RefreshToken, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      user,
    };
  }
}
