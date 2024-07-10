export * from './auth-sign-in';
export * from './auth-sign-up';
export * from './recover-password';
export * from './send-password-recovery';
export * from './verification-verify-email';

type Method = 'POST' | 'GET' | 'DELETE' | 'PATCH';
type EndpointToMethodMap<E extends string> = Record<E, Method>;

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
  RecoverPassword = 'recover-password',
  SendPasswordRecovery = 'send-password-recovery',
}

export const UsersAuthEndpointToMethodMap: EndpointToMethodMap<UsersAuthEndpoint> =
  {
    [UsersAuthEndpoint.SignUp]: 'POST',
    [UsersAuthEndpoint.SignIn]: 'POST',
    [UsersAuthEndpoint.SignOut]: 'POST',
    [UsersAuthEndpoint.Refresh]: 'POST',
    [UsersAuthEndpoint.Me]: 'GET',
    [UsersAuthEndpoint.RecoverPassword]: 'POST',
    [UsersAuthEndpoint.SendPasswordRecovery]: 'POST',
  };

export enum UsersVerificationEndpoint {
  VerifyEmail = 'email',
}

export const UsersVerificationEndpointToMethodMap: EndpointToMethodMap<UsersVerificationEndpoint> =
  {
    [UsersVerificationEndpoint.VerifyEmail]: 'POST',
  };
