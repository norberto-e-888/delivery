import { IsEmail, IsString } from 'class-validator';

export class UsersAuthCreateMagicLinkBody {
  @IsEmail()
  @IsString()
  email!: string;
}
