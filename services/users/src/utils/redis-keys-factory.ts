export const RedisKeysFactory = {
  refreshTokens: (userId: string) => `refresh-tokens:${userId}`,
  tokenExpiryOverride: (userId: string) =>
    `consider-all-tokens-expired:${userId}`,
  passwordRecoveryCode: (email: string) => `password-recovery-code:${email}`,
  emailVerificationToken: (userId: string) =>
    `email-verification-token:${userId}`,
  magicLink: (userId: string) => `magic-link:${userId}`,
  tokensBlacklist: (userId: string) => `tokens-blacklist:${userId}`,
};
