import { Service } from '@delivery/api';
import { createRabbitMQErrorHandler } from '@delivery/providers';

export const rabbitMQErrorHandler = createRabbitMQErrorHandler(Service.Users);
