import { IsEmail, IsString } from 'class-validator';

export class UsersAuthChangeEmailBody {
  @IsEmail()
  @IsString()
  newEmail!: string;
}
