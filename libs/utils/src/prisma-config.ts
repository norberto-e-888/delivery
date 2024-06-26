import Joi = require('joi');

export const prismaConfigJoiSchema = Joi.object<PrismaConfig>({
  prisma: Joi.object<PrismaConfig['prisma']>({
    url: Joi.string().required(),
  }).required(),
});

export type PrismaConfig = {
  prisma: {
    url: string;
  };
};
