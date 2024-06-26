/**
 * initially we had abstracted the creation of a PrismaService to this provider but we realized that
 * it's actually beneficial for each service to declare its own PrismaService, as they might want to
 * add custom methods for repeated data-layer logic
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DynamicModule,
  Global,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';
import Joi from 'joi';

export const PRISMA = Symbol('PRISMA');

@Global()
@Module({})
export class AppPrismaModule {
  static forRootAsync<T extends Constructor>(
    options: PrismaModuleAsyncOptions<T>
  ): DynamicModule {
    const { PrismaService } = options;
    const factory = async (...args: any[]) => {
      const { databaseUrl } = await options.useFactory(...args);
      return new PrismaService({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });
    };

    const PrismaServiceProvider: Provider = {
      provide: PrismaService,
      useFactory: factory,
      inject: options.inject,
    };

    // useful to the outbox-prisma lib
    const PrismaTokenProvider: Provider = {
      provide: PRISMA,
      useFactory: factory,
      inject: options.inject,
    };

    return {
      module: AppPrismaModule,
      imports: [AppPrismaModule],
      providers: [PrismaServiceProvider, PrismaTokenProvider],
      exports: [PrismaServiceProvider, PrismaTokenProvider],
    };
  }
}

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

type Constructor = new (...args: any[]) => any;

type UseFactory = (
  ...args: any[]
) => Promise<PrismaModuleOptions> | PrismaModuleOptions;
interface PrismaModuleOptions {
  databaseUrl: string;
}

interface PrismaModuleAsyncOptions<T extends Constructor>
  extends ModuleMetadata {
  inject?: any[];
  PrismaService: T;
  useFactory: UseFactory;
}
