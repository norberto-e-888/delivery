import { IsEmail, IsString } from 'class-validator';

export class SignInBody {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
