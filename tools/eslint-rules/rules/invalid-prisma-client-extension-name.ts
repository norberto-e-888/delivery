import { TSESLint, TSESTree } from '@typescript-eslint/utils';

export const RULE_NAME = 'invalid-prisma-client-extension-name';

export const rule: TSESLint.RuleModule<'invalidPrismaClientExtensionName', []> =
  {
    defaultOptions: [],
    meta: {
      type: 'problem',
      docs: {
        description:
          'Enforce naming of classes extending PrismaClient as "PrismaService"',
      },
      schema: [],
      messages: {
        invalidPrismaClientExtensionName:
          'Classes extending PrismaClient must be named "PrismaService"',
      },
    },
    create(context) {
      return {
        ClassDeclaration(node: TSESTree.ClassDeclaration) {
          if (
            node.id &&
            node.superClass?.type === 'Identifier' &&
            node.superClass?.name === 'PrismaClient' &&
            node.id.name !== 'PrismaService'
          ) {
            context.report({
              node: node.id,
              messageId: 'invalidPrismaClientExtensionName',
            });
          }
        },
      };
    },
  };
