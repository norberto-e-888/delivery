import { IsEmail, IsString } from 'class-validator';

export class UsersAuthSendPasswordRecoveryBody {
  @IsEmail()
  @IsString()
  email!: string;
}
