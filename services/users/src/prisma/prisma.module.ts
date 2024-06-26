import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/users';
import { OUTBOX_POSTGRES_PRISMA_SERVICE_KEY } from '@delivery/outbox-postgres';
import { createPrismaService } from './prisma.service';
import { Config } from '../config';

export const PrismaService = createPrismaService(PrismaClient);

@Global()
@Module({
  providers: [
    {
      inject: [ConfigService],
      provide: PrismaService,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return new PrismaService({
          datasources: {
            db: {
              url,
            },
          },
        });
      },
    },
    {
      inject: [ConfigService],
      provide: OUTBOX_POSTGRES_PRISMA_SERVICE_KEY,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return new PrismaService({
          datasources: {
            db: {
              url,
            },
          },
        });
      },
    },
  ],
  exports: [PrismaService, OUTBOX_POSTGRES_PRISMA_SERVICE_KEY],
})
export class AppPrismaModule {}
