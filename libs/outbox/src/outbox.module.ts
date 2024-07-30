import { RedisConfig } from '@delivery/providers';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import {
  OUTBOX_QUEUE,
  OutboxQueueProcessor,
  OutboxQueueScheduler,
} from './outbox-queue';
import { OutboxService } from './outbox.service';
import { OutboxPrismaPublisher } from './publish.command';

@Global()
@Module({
  imports: [
    CqrsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<RedisConfig>) => {
        const redisConfig = config.get<RedisConfig['redis']>('redis');

        if (!redisConfig) {
          throw new Error("Expected to find Redis config under key 'redis'");
        }

        const { host, port, username, password } = redisConfig;

        return {
          connection: {
            host,
            port,
            username,
            password,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: OUTBOX_QUEUE,
    }),
  ],
  providers: [
    OutboxPrismaPublisher,
    OutboxService,
    OutboxQueueProcessor,
    OutboxQueueScheduler,
  ],
  exports: [OutboxService],
})
export class OutboxModule {}
