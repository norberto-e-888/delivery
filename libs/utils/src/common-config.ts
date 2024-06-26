import Joi = require('joi');

export enum Environment {
  Development = 'development',
  Testing = 'testing',
  Staging = 'staging',
  Production = 'production',
}

export const commonConfigJoiSchema = Joi.object({
  common: Joi.object({
    port: Joi.number().required().integer().min(1).max(65535),
    environment: Joi.string()
      .allow(...Object.values(Environment))
      .required(),
  }).required(),
});

export type CommonConfig = {
  common: {
    port: number;
    environment: Environment;
  };
};
