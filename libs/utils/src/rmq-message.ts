import { OutboxAggregate } from './outbox';

export interface RMQMessage<D> {
  data: D;
  aggregate: OutboxAggregate;
}
