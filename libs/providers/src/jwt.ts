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
        const jwtConfig = configService.get<JwtConfig['jwt']>('jwt');

        if (!jwtConfig) {
          throw new Error('Expected to find jwt configuration under key "jwt"');
        }

        const { secret, accessTokenDuration } = jwtConfig;

        return {
          secret,
          signOptions: {
            expiresIn: accessTokenDuration,
          },
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}

export const jwtConfigJoiSchema = Joi.object<JwtConfig>({
  jwt: Joi.object<JwtConfig['jwt']>({
    secret: Joi.string().required().length(64),
    accessTokenDuration: Joi.number()
      .integer()
      .min(60)
      .max(60 * 15),
    refreshTokenDuration: Joi.number()
      .integer()
      .min(60 * 60 * 24)
      .max(60 * 60 * 24 * 90),
  }).required(),
});

export type JwtConfig = {
  jwt: {
    secret: string;
    accessTokenDuration: number;
    refreshTokenDuration: number;
  };
};
