import { Environment } from '@delivery/utils';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { createClient } from 'redis';

export const REDIS = Symbol('REDIS');
export const redisProvider: Provider = {
  provide: REDIS,
  inject: [ConfigService],
  useFactory: async (config: ConfigService<RedisConfig>) => {
    const redisConfig = config.get<RedisConfig['redis']>('redis');

    if (!redisConfig) {
      throw new Error('Expected to find redis configuration under key "redis"');
    }

    const { url } = redisConfig;

    const client = createClient({
      url,
    });

    await client.connect();

    return client;
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}

export const redisConfigJoiSchema = Joi.object<RedisConfig>({
  redis: Joi.object<RedisConfig['redis']>({
    url: Joi.string().required(),
    host: Joi.string().required(),
    port: Joi.number().required().positive().integer(),
    username: Joi.string()
    .custom((value?: string) => {
      if (
        process.env['NODE_ENV'] !== Environment.Development &&
        process.env['NODE_ENV'] !== Environment.Testing &&
        !value
      ) {
        throw new Error('Redis username is required');
      }
    }),
    password: Joi.string()
    .custom((value?: string) => {
      if (
        process.env['NODE_ENV'] !== Environment.Development &&
        process.env['NODE_ENV'] !== Environment.Testing &&
        !value
      ) {
        throw new Error('Redis password is required');
      }
    }),
  }).required(),
});

export type RedisConfig = {
  redis: {
    url: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
};

export type Redis = ReturnType<typeof createClient>;

export type RedisMulti = ReturnType<Redis['multi']>;
