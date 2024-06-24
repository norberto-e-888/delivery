import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<MongocConfig>) => {
        const mongoConfig = configService.get<MongocConfig['mongo']>('mongo');

        if (!mongoConfig) {
          throw new Error(
            'Expected to find mongo configuration under key "mongo"'
          );
        }

        const { uri } = mongoConfig;

        return {
          uri,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class AppMongoModule {}

export type MongocConfig = {
  mongo: { uri: string };
};
