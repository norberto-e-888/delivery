import {
  removeArrayDuplicates,
  genSchemaOptions,
  validateEnumArray,
  BaseModel,
} from '@delivery/utils';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const USERS_COLLECTION = 'users';

export enum UserRole {
  CLERK = 'clerk',
  DINER = 'diner',
  DRIVER = 'driver',
  RESTAURANT_OWNER = 'restaurant_owner',
  RESTAURANT_ADMIN = 'restaurant_admin',
  ROOT = 'root',
}

@Schema(
  genSchemaOptions<User>(USERS_COLLECTION, {
    omitFromTransform: ['password'],
  })
)
export class User extends BaseModel {
  @Prop({
    required: true,
  })
  firstName!: string;

  @Prop({
    required: true,
  })
  lastName!: string;

  @Prop({
    required: true,
  })
  email!: string;

  @Prop({
    required: true,
  })
  password!: string;

  @Prop({
    type: [String],
    validate: validateEnumArray(UserRole),
    set: (roles: UserRole[]) => removeArrayDuplicates(roles),
    default: [],
  })
  roles!: UserRole[];

  @Prop({
    default: false,
  })
  isEmailVerified!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

export type UserDocument = HydratedDocument<User>;
