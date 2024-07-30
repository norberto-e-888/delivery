import { IsOptional, IsString } from 'class-validator';

export class UsersProfileUpdateInfoBody {
  @IsString()
  @IsOptional()
  name?: string;
}
