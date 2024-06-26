import { IsEmail, IsString } from 'class-validator';

export class UsersSignUpBody {
  @IsString()
  name!: string;

  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
