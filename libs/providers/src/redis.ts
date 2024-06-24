import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const REDIS_PROVIDER_KEY = Symbol('REDIS_PROVIDER_KEY');
export const redisProvider: Provider = {
  provide: REDIS_PROVIDER_KEY,
  inject: [ConfigService],
  useFactory: async (config: ConfigService<RedisConfig>) => {
    const redisConfig = config.get<RedisConfig['redis']>('redis');

    if (!redisConfig) {
      throw new Error('Expected to find redis configuration under key "redis"');
    }

    const { url, username, password } = redisConfig;

    const client = createClient({
      url,
      username,
      password,
    });

    await client.connect();

    return client;
  },
};

@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class AppRedisModule {}

export type RedisConfig = {
  redis: { url: string; username: string; password: string };
};
