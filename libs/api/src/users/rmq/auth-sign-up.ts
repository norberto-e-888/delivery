import { User } from '@prisma/users';
import { RoutingKeyGenerators } from '@delivery/utils';

export type UsersAuthSignUpEventPayload = {
  user: Omit<User, 'password'>;
};

export const usersAuthSignUpEventRoutingKeyGenerators: RoutingKeyGenerators = {
  producer: () => '',
  consumer: () => '',
};
