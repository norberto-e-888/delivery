import {
  JwtConfig,
  RabbitMQConfig,
  RedisConfig,
  SendgridConfig,
  jwtConfigJoiSchema,
  redisConfigJoiSchema,
  rabbitmqConfigJoiSchema,
  sendgridConfigJoiSchema,
  PrismaConfig,
  prismaConfigJoiSchema,
} from '@delivery/providers';
import {
  CommonConfig,
  commonConfigJoiSchema,
  Environment,
} from '@delivery/utils';
import Joi from 'joi';

export const loadConfig = () => {
  const config: Config = {
    common: {
      port: +process.env.PORT,
      environment: process.env.NODE_ENV as Environment,
    },
    jwt: {
      secret: process.env.AUTH_JWT_SECRET,
      accessTokenDuration: +process.env.AUTH_JWT_ACCESS_TOKEN_DURATION,
      refreshTokenDuration: +process.env.AUTH_JWT_REFRESH_TOKEN_DURATION,
    },
    prisma: {
      url: process.env.POSTGRES_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      db: +process.env.REDIS_DB,
    },
    rabbitmq: {
      uri: process.env.RABBITMQ_URI,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    maxSessions: +process.env.MAX_SESSIONS,
  };

  const validationSchema = Joi.object()
    .concat(jwtConfigJoiSchema)
    .concat(prismaConfigJoiSchema)
    .concat(redisConfigJoiSchema)
    .concat(rabbitmqConfigJoiSchema)
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
  PrismaConfig &
  RedisConfig &
  RabbitMQConfig &
  SendgridConfig &
  CommonConfig &
  ServiceConfig;
