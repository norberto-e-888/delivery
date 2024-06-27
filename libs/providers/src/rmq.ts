import { RabbitMQModule as GoLevelUpRabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Joi from 'joi';

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(topics: Record<string, string>): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        GoLevelUpRabbitMQModule.forRootAsync(GoLevelUpRabbitMQModule, {
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const rmqConfig = configService.get<RMQConfig['rmq']>('rmq');

            if (!rmqConfig) {
              throw new Error(
                'Expected to find rmq configuration under key "rmq"'
              );
            }

            const { uri } = rmqConfig;

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
      exports: [GoLevelUpRabbitMQModule],
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
