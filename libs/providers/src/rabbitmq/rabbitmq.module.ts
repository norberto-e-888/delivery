import { Service } from '@delivery/api';
import {
  AmqpConnection,
  RabbitMQModule as GoLevelUpRabbitMQModule,
} from '@golevelup/nestjs-rabbitmq';
import {
  DynamicModule,
  Global,
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Joi from 'joi';

import { getDLQName } from './create-error-handler';
import { RETRY_QUEUE_NAME, RetryService } from './retry.service';

@Global()
@Module({})
export class RabbitMQModule implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQModule.name);

  constructor(
    private readonly amqp: AmqpConnection,
    private readonly service: Service
  ) {}

  static forRoot({
    service,
    topics,
  }: {
    service: Service;
    topics: Record<string, string>;
  }): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        GoLevelUpRabbitMQModule.forRootAsync(GoLevelUpRabbitMQModule, {
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const rabbitmqConfig =
              configService.get<RabbitMQConfig['rabbitmq']>('rabbitmq');

            if (!rabbitmqConfig) {
              throw new Error(
                'Expected to find rabbitmq configuration under key "rabbitmq"'
              );
            }

            const { uri } = rabbitmqConfig;

            return {
              exchanges: Object.values(topics).map((topic) => ({
                name: topic,
                type: 'topic',
              })),
              uri,
              connectionInitOptions: { wait: true },
            };
          },
        }),
      ],
      providers: [
        RetryService,
        {
          provide: RabbitMQModule,
          inject: [AmqpConnection],
          useFactory: (amqp: AmqpConnection) => {
            return new RabbitMQModule(amqp, service);
          },
        },
      ],
      exports: [GoLevelUpRabbitMQModule, RetryService],
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

export const rabbitmqConfigJoiSchema = Joi.object<RabbitMQConfig>({
  rabbitmq: Joi.object<RabbitMQConfig['rabbitmq']>({
    uri: Joi.string().required(),
  }).required(),
});

export type RabbitMQConfig = {
  rabbitmq: { uri: string };
};
