import {
  AuthConfig,
  MongoConfig,
  RedisConfig,
  SendgridConfig,
  authConfigJoiSchema,
  mongoConfigJoiSchema,
  redisConfigJoiSchema,
  sendgridConfigJoiSchema,
} from '@delivery/providers';
import { CommonConfig, commonConfigJoiSchema } from '@delivery/utils';
import Joi from 'joi';

export const loadConfig = () => {
  const config: Config = {
    auth: {
      jwtSecret: process.env.AUTH_JWT_SECRET,
      refreshTokenSecret: process.env.AUTH_REFRESH_TOKEN_SECRET,
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
  };

  const validationSchema = Joi.any()
    .concat(authConfigJoiSchema)
    .concat(mongoConfigJoiSchema)
    .concat(redisConfigJoiSchema)
    .concat(sendgridConfigJoiSchema)
    .concat(commonConfigJoiSchema);

  const { error } = validationSchema.validate(config, {
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return config;
};

export type Config = AuthConfig &
  MongoConfig &
  RedisConfig &
  SendgridConfig &
  CommonConfig;
