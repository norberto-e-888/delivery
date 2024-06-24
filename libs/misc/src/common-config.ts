import Joi = require('joi');

export type CommonConfig = {
  misc: {
    port: number;
  };
};

export const commonConfigJoiSchema = Joi.object({
  misc: Joi.object({
    port: Joi.number().required().integer().min(1).max(65535),
  }).required(),
});
