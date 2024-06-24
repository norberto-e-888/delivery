import { SchemaOptions } from '@nestjs/mongoose';
import { BaseModel } from './base-model';

export const genSchemaOptions = <M extends BaseModel>(
  collection: string,
  options: Omit<
    SchemaOptions,
    'collection' | 'id' | 'timestamps' | 'toObject'
  > & {
    omitFromTransform?: (keyof M)[];
  } = {}
): SchemaOptions => ({
  ...options,
  collection,
  id: true,
  timestamps: true,
  toObject: {
    virtuals: true,
    getters: true,
    transform: (_, ret: Record<string, unknown>) => ({
      ...ret,
      _id: undefined,
      __v: undefined,
      ...(options.omitFromTransform || []).reduce(
        (toOmit, keyToOmit) => ({
          ...toOmit,
          [keyToOmit]: undefined,
        }),
        {}
      ),
    }),
  },
});
