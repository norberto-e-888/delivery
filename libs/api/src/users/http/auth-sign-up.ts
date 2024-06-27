import { lowercase, trim } from '@delivery/utils';
import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class UsersAuthSignUpBody {
  @Transform(lowercase)
  @Transform(trim)
  @IsString()
  name!: string;

  @Transform(lowercase)
  @Transform(trim)
  @IsEmail()
  @IsString()
  email!: string;

  @IsString()
  password!: string;
}
