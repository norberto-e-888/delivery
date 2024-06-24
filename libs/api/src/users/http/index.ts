export * from './sign-in';
export * from './sign-up';

export enum UsersEndpoint {
  SignUp = '/sign-up',
  SignIn = '/sign-in',
  SignOut = '/sign-out',
  Refresh = '/refresh',
  Me = '/me',
}

export const UsersEndpointToMethodMap: Record<
  UsersEndpoint,
  'POST' | 'GET' | 'DEL' | 'PATCH'
> = {
  [UsersEndpoint.SignUp]: 'POST',
  [UsersEndpoint.SignIn]: 'POST',
  [UsersEndpoint.SignOut]: 'POST',
  [UsersEndpoint.Refresh]: 'POST',
  [UsersEndpoint.Me]: 'GET',
};
