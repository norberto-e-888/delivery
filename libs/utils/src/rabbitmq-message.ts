export interface RabbitMQMessage<T = unknown> {
  meta?: RabbitMQMessageMeta;
  payload: T;
}

export interface RabbitMQMessageMeta {
  originalQueue: string;
  maxRetries: number;
  retryCount: number;
  baseDelay: number;
}
