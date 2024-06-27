import { TSESLint, TSESTree } from '@typescript-eslint/utils';

export const RULE_NAME = 'invalid-prisma-service-name';

export const rule: TSESLint.RuleModule<'invalidPrismaServiceName', []> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce naming of PrismaService parameters as "prisma" in constructors',
      recommended: 'strict',
    },
    schema: [],
    messages: {
      invalidPrismaServiceName:
        'Parameters typed as PrismaService must be named "prisma"',
    },
  },
  create(context) {
    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.kind === 'constructor') {
          node.value.params.forEach((param) => {
            if (param.type === 'TSParameterProperty') {
              const parameter = param.parameter;
              if (
                parameter.type === 'Identifier' &&
                parameter.typeAnnotation?.type === 'TSTypeAnnotation' &&
                parameter.typeAnnotation.typeAnnotation.type ===
                  'TSTypeReference' &&
                parameter.typeAnnotation.typeAnnotation.typeName.type ===
                  'Identifier' &&
                parameter.typeAnnotation.typeAnnotation.typeName.name ===
                  'PrismaService' &&
                parameter.name !== 'prisma'
              ) {
                context.report({
                  node: parameter,
                  messageId: 'invalidPrismaServiceName',
                });
              }
            }
          });
        }
      },
    };
  },
};
