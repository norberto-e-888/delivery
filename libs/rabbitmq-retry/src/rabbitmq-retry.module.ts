import { Service } from '@delivery/api';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';

import { getDLQName } from './get-dlq-name';
import { RETRY_QUEUE_NAME, RetryService } from './retry.service';

@Module({})
export class RabbitMQRetryModule implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQRetryModule.name);

  constructor(
    private readonly amqp: AmqpConnection,
    private readonly service: Service
  ) {}

  static forRoot(service: Service): DynamicModule {
    return {
      module: RabbitMQRetryModule,
      providers: [
        RetryService,
        {
          provide: RabbitMQRetryModule,
          useFactory: (amqp: AmqpConnection) =>
            new RabbitMQRetryModule(amqp, service),
          inject: [AmqpConnection],
        },
      ],
      exports: [RetryService],
    };
  }

  async onModuleInit() {
    const dlqName = getDLQName(this.service);
    await this.amqp.channel.assertQueue(dlqName, {
      durable: true,
    });

    this.logger.log('Dead-letter queue asserted');
    await this.amqp.channel.assertQueue(RETRY_QUEUE_NAME);
    this.logger.log('Retry queue asserted');
  }
}
