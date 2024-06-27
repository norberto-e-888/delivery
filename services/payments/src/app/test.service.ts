import { UsersAuthSignUpEventPayload, UsersTopic } from '@delivery/api';
import { RabbitMQMessage } from '@delivery/utils';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  @RabbitSubscribe({
    exchange: UsersTopic.SignUp,
    routingKey: ['', '.replay.payments'],
    queue: 'payments.react-to-sign-up.test',
  })
  async test(message: RabbitMQMessage<UsersAuthSignUpEventPayload>) {
    this.logger.debug(message);
  }
}
