import { Transform } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Pagination {
  @ApiProperty()
  @IsInt()
  @Transform(({ value }) => Number(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  page!: number;

  @ApiProperty()
  @Min(1)
  @IsInt()
  @Transform(({ value }) => Number(value))
  @IsNumber({ allowNaN: false, allowInfinity: false })
  size!: number;
}
