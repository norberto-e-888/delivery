import { RoutingKeyGenerators } from '@delivery/utils';
import { User } from '@prisma/users';

export type UsersAuthSignUpEventPayload = {
  user: Omit<User, 'password'>;
};

export const usersAuthSignUpEventRoutingKeyGenerators: RoutingKeyGenerators = {
  producer: () => '',
  consumer: () => '',
};
