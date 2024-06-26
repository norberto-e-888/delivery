import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Outbox, OutboxAggregate } from '@delivery/utils';
import { inspect } from 'util';
import { PublishOutboxCommand } from './publish.command';

export const PRISMA = Symbol('PRISMA');

@Injectable()
export class OutboxPostgresService<C> {
  private readonly logger = new Logger(OutboxPostgresService.name);

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
    },
    options: {
      transformPayload?:
        | ((result: T) => Promise<unknown>)
        | ((result: T) => unknown);
      aggregate?: {
        entityIdKey: string;
      };
    } = {}
  ) {
    let returnData: Awaited<T> | null = null;
    let outbox: Outbox | null = null;
    let outboxAggregate: OutboxAggregate | null = null;

    try {
      await this.prisma.$transaction(async (prisma) => {
        const data = await writes(prisma as C);

        let payload: string;

        if (options?.transformPayload) {
          payload = JSON.stringify(await options.transformPayload(data));
        } else {
          payload = data ? JSON.stringify(data) : '{}';
        }

        outbox = await prisma.outbox.create({
          data: {
            exchange: message.exchange,
            routingKey: message.routingKey || null,
            payload,
          },
        });

        returnData = data;

        if (options.aggregate) {
          const parsedPayload = JSON.parse(payload);
          const entityId = options.aggregate.entityIdKey
            .split('.')
            .reduce((curr, key) => curr && curr[key], parsedPayload);

          if (typeof entityId !== 'string') {
            throw new Error(`Invalid entityId: ${entityId}`);
          }

          const latestAggregate = await prisma.outboxAggregate.findFirst({
            where: { entityId },
            orderBy: { version: 'desc' },
          });

          if (latestAggregate) {
            outboxAggregate = await prisma.outboxAggregate.create({
              data: {
                outboxId: latestAggregate.outboxId,
                entityId,
                version: latestAggregate.version + 1,
              },
            });
          } else {
            outboxAggregate = await prisma.outboxAggregate.create({
              data: {
                outboxId: outbox.id,
                entityId,
                version: 1,
              },
            });
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error with Outbox transaction: ${inspect(error)}`);
      throw error;
    }

    if (outbox !== null) {
      this.commandBus
        .execute(
          new PublishOutboxCommand({
            outbox,
            aggregate: outboxAggregate,
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

    return returnData;
  }
}

export interface PrismaTransactionClient {
  outbox: {
    create: (args: {
      data: {
        exchange: string;
        routingKey: string | null;
        payload: string;
      };
    }) => Promise<Outbox>;
    update: (args: {
      where: { id: string };
      data: { isSent: boolean };
    }) => Promise<Outbox>;
  };
  outboxAggregate: {
    create: (args: {
      data: {
        outboxId: string;
        entityId: string;
        version: number;
      };
    }) => Promise<OutboxAggregate>;
    findFirst: (args: {
      where: {
        entityId: string;
      };
      orderBy: {
        version: 'desc';
      };
    }) => Promise<OutboxAggregate | null>;
  };
}

export interface PrismaService {
  $transaction: (
    callback: (prisma: PrismaTransactionClient) => Promise<void>
  ) => Promise<void>;
}
