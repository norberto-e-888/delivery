import { User } from '@prisma/users';

export type UsersAuthEmailChangedEventPayload = {
  user: Omit<User, 'password'>;
};
