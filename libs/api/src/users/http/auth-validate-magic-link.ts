import { IsString } from 'class-validator';

export class UsersAuthValidateMagicLinkBody {
  @IsString()
  userId!: string;

  @IsString()
  token!: string;
}
