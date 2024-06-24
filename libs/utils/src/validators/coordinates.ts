import { IsNumber } from 'class-validator';

export class Coordinates {
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  latitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 6 })
  longitude!: number;
}
