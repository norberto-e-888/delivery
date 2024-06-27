import { Service } from '@delivery/api';
import { createRabbitMQErrorHandler } from '@delivery/rabbitmq-retry';

export const rabbitMQErrorHandler = createRabbitMQErrorHandler(Service.Users);
