export * from './auth-sign-in';
export * from './auth-sign-up';

type Method = 'POST' | 'GET' | 'DELETE' | 'PATCH';

export enum UsersModule {
  Auth = 'auth',
  Verification = 'verification',
}

export enum UsersAuthEndpoint {
  SignUp = 'sign-up',
  SignIn = 'sign-in',
  SignOut = 'sign-out',
  Refresh = 'refresh',
  Me = 'me',
}

export const UsersAuthEndpointToMethodMap: Record<UsersAuthEndpoint, Method> = {
  [UsersAuthEndpoint.SignUp]: 'POST',
  [UsersAuthEndpoint.SignIn]: 'POST',
  [UsersAuthEndpoint.SignOut]: 'POST',
  [UsersAuthEndpoint.Refresh]: 'POST',
  [UsersAuthEndpoint.Me]: 'GET',
};
