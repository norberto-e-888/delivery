import { PRISMA } from '@delivery/providers';
import { RabbitMQMessage } from '@delivery/utils';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { OutboxPrisma, OutboxPrismaAggregate, PrismaClient } from './types';


export class PublishOutboxCommand {
  constructor(
    public readonly message: {
      outbox: OutboxPrisma;
      aggregate?: OutboxPrismaAggregate;
    }
  ) {}
}

@CommandHandler(PublishOutboxCommand)
export class OutboxPrismaPublisher
  implements ICommandHandler<PublishOutboxCommand>
{
  private readonly logger = new Logger(OutboxPrismaPublisher.name);

  constructor(
    @Inject(PRISMA)
    private readonly prisma: PrismaClient,
    private readonly amqp: AmqpConnection
  ) {}

  async execute(command: PublishOutboxCommand) {
    this.logger.debug({
      message: command.message,
    });

    const message: RabbitMQMessage = {
      aggregate: command.message.aggregate && {
        entityId: command.message.aggregate.entityId,
        version: command.message.aggregate.version,
      },
      payload: JSON.parse(command.message.outbox.payload),
    };

    this.amqp.publish(
      command.message.outbox.exchange,
      command.message.outbox.routingKey || '',
      message
    );

    await this.prisma.outbox.update({
      where: { id: command.message.outbox.id },
      data: { isSent: true },
    });
  }
}
