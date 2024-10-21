import { IsString } from 'class-validator';

export class UsersAuthUpdatePasswordBody {
  @IsString()
  token!: string;

  @IsString()
  password!: string;
}
