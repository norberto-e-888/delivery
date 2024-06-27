import {
  RULE_NAME as invalidPrismaClientExtensionNameName,
  rule as invalidPrismaClientExtensionName,
} from './rules/invalid-prisma-client-extension-name';
import {
  RULE_NAME as invalidPrismaServiceNameName,
  rule as invalidPrismaServiceName,
} from './rules/invalid-prisma-service-name';
import {
  RULE_NAME as noThisPrismaUserName,
  rule as noThisPrismaUser,
} from './rules/no-this-prisma-user';

module.exports = {
  rules: {
    [noThisPrismaUserName]: noThisPrismaUser,
    [invalidPrismaServiceNameName]: invalidPrismaServiceName,
    [invalidPrismaClientExtensionNameName]: invalidPrismaClientExtensionName,
  },
};
