import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import Joi from 'joi';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthConfig['auth']>('auth');

        if (!authConfig) {
          throw new Error(
            'Expected to find auth configuration under key "auth"'
          );
        }

        const { jwtSecret } = authConfig;

        return {
          secret: jwtSecret,
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}

export const authConfigJoiSchema = Joi.object<AuthConfig>({
  auth: Joi.object<AuthConfig['auth']>({
    jwtSecret: Joi.string().required().length(64),
    refreshTokenSecret: Joi.string().required().length(64),
  }).required(),
});

export type AuthConfig = {
  auth: { jwtSecret: string; refreshTokenSecret: string };
};
