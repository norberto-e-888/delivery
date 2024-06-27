import { RMQConfig, rmqConfigJoiSchema } from '@delivery/providers';
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
    rmq: {
      uri: process.env.RMQ_URI,
    },
  };

  const validationSchema = Joi.any()
    .concat(commonConfigJoiSchema)
    .concat(rmqConfigJoiSchema);

  const { error } = validationSchema.validate(config, {
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return config;
};

export type Config = CommonConfig & RMQConfig;
