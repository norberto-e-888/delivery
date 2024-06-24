import { ApiProperty } from '@nestjs/swagger';

export class BaseModel {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
