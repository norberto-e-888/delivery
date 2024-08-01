import { toBoolean, toInt } from '@delivery/utils';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UsersAuthSignOutQuery {
  @Transform(toBoolean)
  @Max(1)
  @Min(0)
  @IsInt()
  @Transform(toInt)
  fromAllSessions?: boolean;
}
