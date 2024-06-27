import { Service } from '@delivery/api';
import {
  createRabbitMQErrorHandler,
  getDLXName,
} from '@delivery/rabbitmq-retry';

export const rabbitMQErrorHandler = createRabbitMQErrorHandler(Service.Users);
export const USERS_DLX_NAME = getDLXName(Service.Users);
