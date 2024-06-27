export interface RabbitMQMessage<T = unknown> {
  aggregate?: RabbitMQMessageAggregate;
  meta?: RabbitMQMessageMeta;
  payload: T;
}

export interface RabbitMQMessageAggregate {
  entityId: string;
  version: number;
}

export interface RabbitMQMessageMeta {
  originalQueue: string;
  maxRetries: number;
  retryCount: number;
  baseDelay: number;
}
