export * from './auth-create-magic-link';
export * from './auth-recover-password';
export * from './auth-request-password-recovery';
export * from './auth-sign-in';
export * from './auth-sign-up';
export * from './auth-sign-out';
export * from './auth-update-email';
export * from './auth-update-password';
export * from './auth-validate-magic-link';
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
  CreateMagicLink = 'magic-link',
  ValidateMagicLink = 'magic-link/validate',
  RequestEmailUpdateToken = 'request-email-update-token',
  UpdateEmail = 'email',
  RequestPasswordUpdateToken = 'request-password-update-token',
  UpdatePassword = 'password',
  RequestPasswordRecoveryToken = 'request-password-recovery-token',
  RecoverPassword = 'password/recover',
}

export const UsersAuthEndpointToMethodMap: EndpointToMethodMap<UsersAuthEndpoint> =
  {
    [UsersAuthEndpoint.SignUp]: 'POST',
    [UsersAuthEndpoint.SignIn]: 'POST',
    [UsersAuthEndpoint.SignOut]: 'POST',
    [UsersAuthEndpoint.Refresh]: 'POST',
    [UsersAuthEndpoint.Me]: 'GET',
    [UsersAuthEndpoint.CreateMagicLink]: 'POST',
    [UsersAuthEndpoint.ValidateMagicLink]: 'POST',
    [UsersAuthEndpoint.RequestEmailUpdateToken]: 'POST',
    [UsersAuthEndpoint.UpdateEmail]: 'PATCH',
    [UsersAuthEndpoint.RequestPasswordUpdateToken]: 'POST',
    [UsersAuthEndpoint.UpdatePassword]: 'PATCH',
    [UsersAuthEndpoint.RequestPasswordRecoveryToken]: 'POST',
    [UsersAuthEndpoint.RecoverPassword]: 'PATCH',
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
