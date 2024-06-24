import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  _id: false,
  versionKey: false,
})
export class OutboxAggregate {
  @Prop()
  entityId!: string;

  @Prop()
  version!: number;
}

@Schema({
  id: true,
  timestamps: {
    createdAt: true,
  },
  collection: '_outbox',
})
export class Outbox {
  @Prop({ required: true })
  exchange!: string;

  @Prop()
  routingKey?: string;

  @Prop({ required: true })
  payload!: string;

  @Prop({
    type: OutboxAggregate,
  })
  aggregate?: OutboxAggregate;

  @Prop({
    default: false,
  })
  isSent!: boolean;
}

export const OutboxSchema = SchemaFactory.createForClass(Outbox);

OutboxSchema.index(
  { 'aggregate.entityId': 1, 'aggregate.version': 1 },
  { unique: true, sparse: true }
);

export type OutboxDocument = HydratedDocument<Outbox> & {
  id: string;
  createdAt: Date;
};
