import { IsEmail, IsString } from 'class-validator';

export class UsersAuthSignInBody {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
