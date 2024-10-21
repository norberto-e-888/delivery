import { IsEmail, IsString } from 'class-validator';

export class UsersAuthRequestPasswordRecoveryBody {
  @IsString()
  @IsEmail()
  email!: string;
}
