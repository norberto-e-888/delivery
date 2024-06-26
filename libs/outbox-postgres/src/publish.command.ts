import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Outbox } from '@delivery/utils';

import {
  OUTBOX_POSTGRES_PRISMA_SERVICE_KEY,
  PrismaTransactionClient,
} from './outbox.service';

export class PublishOutboxCommand {
  constructor(public readonly message: Outbox) {}
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
      command.message.exchange,
      command.message.routingKey || '',
      JSON.parse(command.message.payload)
    );

    await this.prisma.outbox.update({
      where: { id: command.message.id },
      data: { isSent: true },
    });
  }
}
