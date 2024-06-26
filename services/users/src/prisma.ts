import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/users';

export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  get passwordSafe() {
    return this.$extends({
      result: {
        user: {
          password: {
            compute: () => undefined,
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
