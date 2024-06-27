import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

import { RETRY_QUEUE_NAME, RetryService } from './retry.service';
import { Service } from '@delivery/api';
import { getDLXName } from './get-dlx-name';

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
    const dlxName = getDLXName(this.service);
    await this.amqp.channel.assertExchange(dlxName, 'topic', {
      durable: true,
    });

    this.logger.log('Dead-letter exchange asserted');
    await this.amqp.channel.assertQueue(RETRY_QUEUE_NAME);
    this.logger.log('Retry queue asserted');
  }
}
