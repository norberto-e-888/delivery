import { IsEmail, IsString } from 'class-validator';

export class UsersAuthChangeEmailBody {
  @IsEmail()
  @IsString()
  email!: string;

  @IsString()
  token!: string;
}
