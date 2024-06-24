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

        const { secret } = jwtConfig;

        return {
          secret,
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}

export const jwtConfigJoiSchema = Joi.object({
  jwt: Joi.object({
    secret: Joi.string().required().length(64),
  }).required(),
});

export type JwtConfig = {
  jwt: { secret: string };
};
