import { IsString } from 'class-validator';

export class UsersVerificationVerifyEmailBody {
  @IsString()
  token!: string;
}
