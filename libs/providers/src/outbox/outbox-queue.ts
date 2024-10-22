import { RabbitMQMessage } from '@delivery/utils';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { PRISMA } from '../prisma';

import { PrismaClient } from './types';

export const OUTBOX_QUEUE = 'outbox-queue';

@Processor(OUTBOX_QUEUE)
export class OutboxQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboxQueueProcessor.name);

  constructor(
    private readonly amqp: AmqpConnection,
    @Inject(PRISMA)
    private readonly prisma: PrismaClient
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async process(job: Job<null>): Promise<void> {
    this.logger.verbose('Executing outbox publisher CRON...');

    const unsentMessages = await this.prisma.outbox.findMany({
      where: {
        isSent: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const unsentMessage of unsentMessages) {
      const { id, exchange, routingKey, payload } = unsentMessage;
      const message: RabbitMQMessage = {
        payload,
      };

      this.amqp.publish(exchange, routingKey || '', message);
      await this.prisma.outbox.update({
        where: { id },
        data: { isSent: true },
      });
    }

    this.logger.verbose(
      `Outbox publisher CRON ran for ${unsentMessages.length} messages`
    );
  }
}

@Injectable()
export class OutboxQueueScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(OUTBOX_QUEUE)
    private readonly outboxQueue: Queue
  ) {}

  async onModuleInit() {
    await this.outboxQueue.add(
      'outbox-publisher',
      {},
      {
        repeat: {
          every: 1000 * 5,
        },
        jobId: 'outbox-publisher-job',
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
  }
}
