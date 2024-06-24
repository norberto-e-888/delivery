import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import Joi from 'joi';

@Global()
@Module({})
export class AppRabbitMQModule {
  static forRoot(topics: string[]): DynamicModule {
    return {
      module: AppRabbitMQModule,
      imports: [
        RabbitMQModule.forRoot(RabbitMQModule, {
          exchanges: topics.map((topic) => ({ name: topic, type: 'topic' })),
          uri: process.env['RMQ_URI'] as string,
          connectionInitOptions: { wait: true },
        }),
      ],
      exports: [RabbitMQModule],
    };
  }
}

export const rmqConfigJoiSchema = Joi.object<RMQConfig>({
  rmq: Joi.object<RMQConfig['rmq']>({
    uri: Joi.string().required(),
  }).required(),
});

export type RMQConfig = {
  rmq: { uri: string };
};
