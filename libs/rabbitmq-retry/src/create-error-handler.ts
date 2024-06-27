import { inspect } from 'util';

import { Service } from '@delivery/api';
import { RabbitMQMessage } from '@delivery/utils';
import { Logger } from '@nestjs/common';
import { Channel, ConsumeMessage } from 'amqplib';

import { getDLXName } from './get-dlx-name';
import { DEFAULT_EXCHANGE, RETRY_QUEUE_NAME } from './retry.service';

export const createRabbitMQErrorHandler =
  (service: Service) =>
  ({
    baseDelay = 1000,
    maxRetries = 5,
    queue,
  }: CreateRabbitMQErrorHandlerArgs) =>
  async (channel: Channel, msg: ConsumeMessage, error: unknown) => {
    Logger.warn(
      `Error processing message for queue "${queue}":`,
      inspect(error)
    );

    channel.ack(msg, false);

    const payloadString = msg.content.toString();
    const message = JSON.parse(payloadString) as RabbitMQMessage;

    if (!message.meta) {
      message.meta = {
        baseDelay,
        maxRetries,
        originalQueue: queue,
        retryCount: 1,
      };
    } else {
      message.meta.retryCount += 1;
    }

    if (message.meta.retryCount > message.meta.maxRetries) {
      console.error(
        `Message for queue "${message.meta.originalQueue}" has reached max retries. Moving to dead letter exchange.`
      );

      channel.publish(
        getDLXName(service),
        queue,
        Buffer.from(JSON.stringify(message))
      );

      return;
    }

    const messageTtl = message.meta.baseDelay * 2 ** message.meta.retryCount;
    const delayedQueueName = `_delayed.${messageTtl}`;

    await channel.assertQueue(delayedQueueName, {
      deadLetterExchange: DEFAULT_EXCHANGE,
      deadLetterRoutingKey: RETRY_QUEUE_NAME,
      messageTtl,
    });

    channel.sendToQueue(delayedQueueName, Buffer.from(JSON.stringify(message)));
  };

export interface CreateRabbitMQErrorHandlerArgs {
  baseDelay?: number;
  maxRetries?: number;
  queue: string;
}
