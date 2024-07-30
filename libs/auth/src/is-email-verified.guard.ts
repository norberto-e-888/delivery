import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { AppRequest } from './is-logged-in.guard';

@Injectable()
export class IsEmailVerified implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();

    if (!request.atp) {
      throw new HttpException(
        '"Is email verified" guard can only run when "is logged in" guard is present',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    if (!request.atp.isEmailVerified) {
      throw new HttpException(
        'You must verify your email to access this resource',
        HttpStatus.UNAUTHORIZED
      );
    }

    return true;
  }
}
