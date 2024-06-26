import {
  JwtConfig,
  MongoConfig,
  RMQConfig,
  RedisConfig,
  SendgridConfig,
  jwtConfigJoiSchema,
  mongoConfigJoiSchema,
  redisConfigJoiSchema,
  rmqConfigJoiSchema,
  sendgridConfigJoiSchema,
} from '@delivery/providers';
import {
  CommonConfig,
  commonConfigJoiSchema,
  PrismaConfig,
  prismaConfigJoiSchema,
} from '@delivery/utils';
import Joi from 'joi';

export const loadConfig = () => {
  const config: Config = {
    jwt: {
      secret: process.env.AUTH_JWT_SECRET,
      accessTokenDuration: +process.env.AUTH_JWT_ACCESS_TOKEN_DURATION,
      refreshTokenDuration: +process.env.AUTH_JWT_REFRESH_TOKEN_DURATION,
    },
    mongo: {
      uri: process.env.MONGO_URI,
    },
    prisma: {
      url: process.env.POSTGRES_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
    },
    rmq: {
      uri: process.env.RMQ_URI,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    misc: {
      port: +process.env.PORT,
    },
    maxSessions: +process.env.MAX_SESSIONS,
  };

  const validationSchema = Joi.any()
    .concat(jwtConfigJoiSchema)
    .concat(mongoConfigJoiSchema)
    .concat(prismaConfigJoiSchema)
    .concat(redisConfigJoiSchema)
    .concat(rmqConfigJoiSchema)
    .concat(sendgridConfigJoiSchema)
    .concat(commonConfigJoiSchema)
    .concat(
      Joi.object<ServiceConfig>({
        maxSessions: Joi.number().integer().min(1).required(),
      })
    );

  const { error } = validationSchema.validate(config, {
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return config;
};

type ServiceConfig = {
  maxSessions: number;
};

export type Config = JwtConfig &
  MongoConfig &
  PrismaConfig &
  RedisConfig &
  RMQConfig &
  SendgridConfig &
  CommonConfig &
  ServiceConfig;
