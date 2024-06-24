import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InjectModel } from '@nestjs/mongoose';
import { Outbox, OutboxDocument } from './outbox.schema';
import { Model } from 'mongoose';

export class PublishOutboxCommand {
  constructor(public readonly message: OutboxDocument) {}
}

@CommandHandler(PublishOutboxCommand)
export class OutboxPublisherHandler
  implements ICommandHandler<PublishOutboxCommand>
{
  private readonly logger = new Logger(OutboxPublisherHandler.name);

  constructor(
    @InjectModel(Outbox.name) private readonly outbox: Model<OutboxDocument>,
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

    await this.outbox.findByIdAndUpdate(command.message.id, {
      isSent: true,
    });
  }
}
