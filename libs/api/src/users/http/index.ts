export * from './auth-sign-in';
export * from './auth-sign-up';
export * from './auth-recover-password';
export * from './auth-send-password-recovery';
export * from './auth-change-email';
export * from './profile-update-info';
export * from './verification-verify-email';

type Method = 'POST' | 'GET' | 'DELETE' | 'PATCH';
type EndpointToMethodMap<E extends string> = Record<E, Method>;

export enum UsersModule {
  Auth = 'auth',
  Profile = 'profile',
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
  ChangeEmail = 'change-email',
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
    [UsersAuthEndpoint.ChangeEmail]: 'PATCH',
  };

export enum UsersProfileEndpoint {
  UpdateProfileInfo = '',
}

export const UsersProfileEndpointToMethodMap: EndpointToMethodMap<UsersProfileEndpoint> =
  {
    [UsersProfileEndpoint.UpdateProfileInfo]: 'PATCH',
  };

export enum UsersVerificationEndpoint {
  VerifyEmail = 'email',
  ResendEmailVerification = 'resend-email-verification',
}

export const UsersVerificationEndpointToMethodMap: EndpointToMethodMap<UsersVerificationEndpoint> =
  {
    [UsersVerificationEndpoint.VerifyEmail]: 'POST',
    [UsersVerificationEndpoint.ResendEmailVerification]: 'POST',
  };
