import { IsEmail, IsString } from 'class-validator';

export class UsersSignInBody {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
