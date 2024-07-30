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
    username: Joi.string().custom((value?: string) => {
      if (
        process.env['NODE_ENV'] !== Environment.Development &&
        process.env['NODE_ENV'] !== Environment.Testing &&
        !value
      ) {
        throw new Error('Redis username is required');
      }
    }),
    password: Joi.string().custom((value?: string) => {
      if (
        process.env['NODE_ENV'] !== Environment.Development &&
        process.env['NODE_ENV'] !== Environment.Testing &&
        !value
      ) {
        throw new Error('Redis password is required');
      }
    }),
    db: Joi.number()
      .custom((value?: string) => {
        if (
          (process.env['NODE_ENV'] === Environment.Production ||
            process.env['NODE_ENV'] === Environment.Staging) &&
          value != null
        ) {
          throw new Error('Redis db must not be present');
        }

        if (
          (process.env['NODE_ENV'] == Environment.Development ||
            process.env['NODE_ENV'] === Environment.Testing) &&
          value == null
        ) {
          throw new Error('Redis db is required');
        }
      })
      .allow(0, 1, 2, 3, 4, 5), // allow as many as there are services
  }).required(),
});

export type RedisConfig = {
  redis: {
    url: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
  };
};

export type Redis = ReturnType<typeof createClient>;

export type RedisMulti = ReturnType<Redis['multi']>;
