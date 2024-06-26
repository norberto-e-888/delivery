import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/users';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(url: string) {
    super({
      datasources: {
        db: {
          url,
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

/* 
function createPrismaService<T extends typeof PrismaClient>(BaseClass: T) {
  @Injectable()
  class PrismaService extends BaseClass implements OnModuleInit, OnModuleDestroy {
    constructor(url: string) {
      super({
        datasources: {
          db: {
            url,
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

  return PrismaService;
} */
