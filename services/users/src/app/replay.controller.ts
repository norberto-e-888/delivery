import { RabbitMQMessage, RabbitMQMessageAggregate } from '@delivery/utils';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Controller, Param, Post } from '@nestjs/common';

import { PrismaService } from './prisma';

@Controller()
export class ReplayController {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly prisma: PrismaService
  ) {}

  @Post('replay/:service')
  async replay(@Param('service') service: string) {
    const outboxMessages = await this.prisma.outbox.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    for (const message of outboxMessages) {
      const rabbitMQMessage: RabbitMQMessage = {
        aggregate: message.aggregate as unknown as RabbitMQMessageAggregate,
        payload: JSON.parse(message.payload),
      };

      await this.amqp.publish(
        message.exchange,
        (message.routingKey || '') + `.replay.${service}`,
        rabbitMQMessage
      );
    }

    console.log({
      service,
      outboxMessages,
    });
  }
}
