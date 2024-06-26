import {
  RULE_NAME as noThisPrismaUserName,
  rule as noThisPrismaUser,
} from './rules/no-this-prisma-user';

module.exports = {
  rules: { [noThisPrismaUserName]: noThisPrismaUser },
};
