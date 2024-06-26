/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DynamicModule,
  Global,
  Module,
  ModuleMetadata,
  Provider,
  OnModuleInit,
  OnModuleDestroy,
  Injectable,
} from '@nestjs/common';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({})
export class AppPrismaModule {
  static forRootAsync<T extends new (...args: any[]) => any>(
    options: PrismaModuleAsyncOptions<T>
  ): DynamicModule {
    const { PrismaClientClass } = options;
    const PrismaServiceClass = createPrismaService(PrismaClientClass);
    const PrismaServiceProvider: Provider = {
      provide: PRISMA,
      useFactory: async (...args: any[]) => {
        const { databaseUrl } = await options.useFactory(...args);
        return new PrismaServiceClass({
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        });
      },
      inject: options.inject,
    };

    return {
      module: AppPrismaModule,
      imports: [AppPrismaModule],
      providers: [PrismaServiceProvider],
      exports: [PrismaServiceProvider],
    };
  }
}

function createPrismaService<T extends new (...args: any[]) => any>(
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
      await this['$connect']();
    }

    async onModuleDestroy() {
      await this['$disconnect']();
    }
  }

  return PrismaService;
}

interface PrismaModuleOptions {
  databaseUrl: string;
}

interface PrismaModuleAsyncOptions<T extends new (...args: any[]) => any>
  extends ModuleMetadata {
  PrismaClientClass: T;
  useFactory: (
    ...args: any[]
  ) => Promise<PrismaModuleOptions> | PrismaModuleOptions;
  inject?: any[];
}
