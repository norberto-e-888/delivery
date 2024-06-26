import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Outbox, OutboxAggregate } from '@delivery/utils';

import {
  OUTBOX_POSTGRES_PRISMA_SERVICE_KEY,
  PrismaTransactionClient,
} from './outbox.service';

export class PublishOutboxCommand {
  constructor(
    public readonly message: {
      outbox: Outbox;
      aggregate: OutboxAggregate | null;
    }
  ) {}
}

@CommandHandler(PublishOutboxCommand)
export class OutboxPublisherHandler
  implements ICommandHandler<PublishOutboxCommand>
{
  private readonly logger = new Logger(OutboxPublisherHandler.name);

  constructor(
    @Inject(OUTBOX_POSTGRES_PRISMA_SERVICE_KEY)
    private readonly prisma: PrismaTransactionClient,
    private readonly amqp: AmqpConnection
  ) {}

  async execute(command: PublishOutboxCommand) {
    this.logger.debug({
      message: command.message,
    });

    this.amqp.publish(
      command.message.outbox.exchange,
      command.message.outbox.routingKey || '',
      {
        data: JSON.parse(command.message.outbox.payload),
        aggregate: command.message.aggregate,
      }
    );

    await this.prisma.outbox.update({
      where: { id: command.message.outbox.id },
      data: { isSent: true },
    });
  }
}
