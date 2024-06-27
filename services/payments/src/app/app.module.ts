import { RabbitMQModule } from '@delivery/providers';
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
  ],
  providers: [TestService],
})
export class AppModule {}
