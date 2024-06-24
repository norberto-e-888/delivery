import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Joi from 'joi';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<MongoConfig>) => {
        const mongoConfig = configService.get<MongoConfig['mongo']>('mongo');

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

export const mongoConfigJoiSchema = Joi.object({
  mongo: Joi.object({
    uri: Joi.string().required(),
  }).required(),
});

export type MongoConfig = {
  mongo: { uri: string };
};
