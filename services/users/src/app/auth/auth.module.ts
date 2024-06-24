import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Config } from '../../config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { secret } = configService.get<Config['jwt']>('jwt');
        return {
          secret,
        };
      },
    }),
  ],
})
export class AuthModule {}
