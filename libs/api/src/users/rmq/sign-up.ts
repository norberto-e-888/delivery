import { User } from '@delivery/models';
import { RoutingKeyGenerators } from '@delivery/utils';

export type UsersEventSignUpPayload = {
  user: Omit<User, 'password'>;
};

export const userEventSignUpRoutingKeyGenerators: RoutingKeyGenerators = {
  producer: () => '',
  consumer: () => '',
};
