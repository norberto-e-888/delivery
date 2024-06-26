import { TSESLint, TSESTree } from '@typescript-eslint/utils';

export const RULE_NAME = 'no-this-prisma-user';

export const rule: TSESLint.RuleModule<'noThisPrismaUser', []> = {
  defaultOptions: [],
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of prisma.user',
      recommended: 'strict',
    },
    schema: [],
    messages: {
      noThisPrismaUser: 'Use prisma.extended.user instead. ',
    },
  },
  create(context) {
    function isWithinAllowedContext(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      let withinSignInMethod = false;
      let withinAuthService = false;

      while (current) {
        if (
          current.type === 'MethodDefinition' &&
          current.key.type === 'Identifier' &&
          current.key.name === 'signIn'
        ) {
          withinSignInMethod = true;
        }

        if (
          current.type === 'ClassDeclaration' &&
          current.id &&
          current.id.type === 'Identifier' &&
          current.id.name === 'AuthService'
        ) {
          withinAuthService = true;
        }

        if (withinSignInMethod && withinAuthService) {
          return true;
        }

        current = current.parent;
      }

      return false;
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'user'
        ) {
          if (
            node.object.type === 'Identifier' &&
            node.object.name === 'prisma'
          ) {
            context.report({
              node: node,
              messageId: 'noThisPrismaUser',
              data: { access: 'prisma.user' },
            });
          } else if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'ThisExpression' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'prisma'
          ) {
            if (!isWithinAllowedContext(node)) {
              context.report({
                node: node,
                messageId: 'noThisPrismaUser',
                data: { access: 'this.prisma.user' },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
