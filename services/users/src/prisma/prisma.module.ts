import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';
import { Config } from '../config';
import { OUTBOX_POSTGRES_PRISMA_SERVICE_KEY } from '@delivery/outbox-postgres';

@Global()
@Module({
  providers: [
    {
      inject: [ConfigService],
      provide: PrismaService,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return new PrismaService(url);
      },
    },
    {
      inject: [ConfigService],
      provide: OUTBOX_POSTGRES_PRISMA_SERVICE_KEY,
      useFactory: (config: ConfigService<Config>) => {
        const { url } = config.get<Config['prisma']>('prisma');
        return new PrismaService(url);
      },
    },
  ],
  exports: [PrismaService, OUTBOX_POSTGRES_PRISMA_SERVICE_KEY],
})
export class AppPrismaModule {}
