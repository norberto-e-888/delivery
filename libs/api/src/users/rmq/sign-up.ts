import { User } from '@prisma/users';
import { RoutingKeyGenerators } from '@delivery/utils';

export type UsersEventSignUpPayload = {
  user: Omit<User, 'password'>;
};

export const usersEventSignUpRoutingKeyGenerators: RoutingKeyGenerators = {
  producer: () => '',
  consumer: () => '',
};
