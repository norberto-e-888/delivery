import { PRISMA } from '@delivery/providers';
import { RabbitMQMessage } from '@delivery/utils';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { OutboxPrisma, PrismaClient } from './types';

export class PublishOutboxCommand {
  constructor(
    public readonly message: {
      outbox: OutboxPrisma;
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
    const {
      message: { outbox },
    } = command;
    this.logger.debug({
      message: command.message,
    });

    const message: RabbitMQMessage = {
      payload: JSON.parse(outbox.payload),
    };

    this.amqp.publish(outbox.exchange, outbox.routingKey || '', message);
    await this.prisma.outbox.update({
      where: { id: outbox.id },
      data: { isSent: true },
    });
  }
}
