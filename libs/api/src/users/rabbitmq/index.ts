export * from './auth-change-email';
export * from './auth-sign-up';

export enum UsersTopic {
  SignUp = 'users.auth.sign-up',
  EmailChanged = 'users.auth.email-changed',
}

export enum UsersQueue {
  SendEmailVerificationOnSignUp = 'users.verification.send-email-verification-on-sign-up',
  SendEmailVerificationOnEmailChange = 'users.verification.send-email-verification-on-email-change',
}
