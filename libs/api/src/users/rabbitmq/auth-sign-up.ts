import { User } from '@prisma/users';

export type UsersAuthSignUpEventPayload = {
  user: Omit<User, 'password'>;
};
