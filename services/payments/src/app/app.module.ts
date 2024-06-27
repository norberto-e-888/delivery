import { Service } from '@delivery/api';
import { RabbitMQModule } from '@delivery/providers';
import { RabbitMQRetryModule } from '@delivery/rabbitmq-retry';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { loadConfig } from './config';
import { TestService } from './test.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    RabbitMQModule.forRoot({}),
    RabbitMQRetryModule.forRoot(Service.Payments),
  ],
  providers: [TestService],
})
export class AppModule {}
