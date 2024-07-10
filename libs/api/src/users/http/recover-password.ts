import { IsEmail, IsString, Length } from 'class-validator';

export class UsersAuthRecoverPasswordBody {
  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  newPassword!: string;
}
