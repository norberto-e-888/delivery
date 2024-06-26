/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export function createPrismaService<T extends new (...args: any[]) => any>(
  BaseClass: T
) {
  @Injectable()
  class PrismaService
    extends BaseClass
    implements OnModuleInit, OnModuleDestroy
  {
    constructor(...args: any[]) {
      super(args[0]);
    }

    async onModuleInit() {
      await this.$connect();
    }

    async onModuleDestroy() {
      await this.$disconnect();
    }
  }

  return PrismaService;
}
