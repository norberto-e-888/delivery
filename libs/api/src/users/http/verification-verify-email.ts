import { trim } from '@delivery/utils';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class UsersVerificationVerifyEmailBody {
  @Transform(trim)
  @IsString()
  token!: string;
}
