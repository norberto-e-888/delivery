import {
  JwtConfig,
  MongoConfig,
  RedisConfig,
  SendgridConfig,
} from '@delivery/providers';
import { CommonConfig } from '@delivery/types';

export const loadConfig = () =>
  ({
    jwt: {
      secret: process.env.JWT_SECRET,
    },
    mongo: {
      uri: process.env.MONGO_URI,
    },
    redis: {
      url: process.env.REDIS_URL,
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    misc: {
      port: +process.env.PORT,
    },
  } as JwtConfig & MongoConfig & RedisConfig & SendgridConfig & CommonConfig);

export type Config = ReturnType<typeof loadConfig>;
