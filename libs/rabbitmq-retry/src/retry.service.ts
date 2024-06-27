import { inspect } from 'util';

import { RabbitMQMessage } from '@delivery/utils';
import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';


export const DEFAULT_EXCHANGE = '';
export const RETRY_QUEUE_NAME = '_retry';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  constructor(private readonly amqp: AmqpConnection) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE,
    routingKey: '', // the default exchange is of type direct, so this routing key does nothing but it helps to make the logs from '@golevelup/nestjs-rabbitmq' prettier
    queue: RETRY_QUEUE_NAME,
  })
  async retry(message: RabbitMQMessage) {
    try {
      this.logger.debug('retrying message', message);
      this.amqp.channel.sendToQueue(
        message.meta?.originalQueue as string,
        Buffer.from(JSON.stringify(message))
      );
    } catch (error) {
      this.logger.error(
        'Error processing message for queue "retry":',
        inspect(error)
      );
    }
  }
}
