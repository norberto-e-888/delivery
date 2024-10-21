import { IsEmail, IsString } from 'class-validator';

export class UsersAuthRecoverPasswordBody {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  token!: string;
}
