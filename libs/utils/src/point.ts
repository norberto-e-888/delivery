import { Prop, Schema } from '@nestjs/mongoose';
import { Types, Schema as _Schema } from 'mongoose';

@Schema({
  _id: false,
})
export class Point {
  @Prop({
    enum: ['Point'],
    default: 'Point',
  })
  type!: 'Point';

  @Prop({
    type: [_Schema.Types.Decimal128, _Schema.Types.Decimal128],
    transform: (v: [Types.Decimal128, Types.Decimal128]) =>
      v.map((decimal) => parseFloat(decimal.toString())),
  })
  coordinates!: [number, number];
}
