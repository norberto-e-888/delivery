import { IsString } from 'class-validator';

export class UsersAuthCreatePasswordBody {
  @IsString()
  token!: string;

  @IsString()
  password!: string;
}
