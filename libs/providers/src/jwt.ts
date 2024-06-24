import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

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

export type JwtConfig = {
  jwt: { secret: string };
};
