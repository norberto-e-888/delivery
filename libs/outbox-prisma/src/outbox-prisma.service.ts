import { inspect } from 'util';

import { PRISMA } from '@delivery/providers';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { PublishOutboxCommand } from './publish.command';
import { OutboxPrisma, PrismaService } from './types';

@Injectable()
export class OutboxPrismaService<C> {
  private readonly logger = new Logger(OutboxPrismaService.name);

  constructor(
    @Inject(PRISMA)
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus
  ) {}

  async publish<T>(
    writes: (transaction: C) => Promise<T>,
    message: {
      exchange: string;
      routingKey?: string;
    }
  ) {
    let data: Awaited<T> | null = null;
    let outbox: OutboxPrisma | null = null;

    try {
      await this.prisma.$transaction(async (prisma) => {
        data = await writes(prisma as C);

        outbox = await prisma.outbox.create({
          data: {
            exchange: message.exchange,
            routingKey: message.routingKey || null,
            payload: JSON.stringify(data),
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Error with OutboxPrisma transaction: ${inspect(error)}`
      );
      throw error;
    }

    if (outbox !== null) {
      this.commandBus
        .execute(
          new PublishOutboxCommand({
            outbox,
          })
        )
        .then(() => {
          this.logger.verbose(
            `Successfully executed PublishOutboxCommand for message with Id ${outbox?.id}`
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error executing PublishOutboxCommand for message with Id ${
              outbox?.id
            }: ${inspect(error)}`
          );
        });
    }

    return data;
  }
}
