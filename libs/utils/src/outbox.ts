export interface Outbox {
  id: string;
  exchange: string;
  routingKey: string | null;
  payload: string;
  createdAt: Date;
}

export interface OutboxAggregate {
  outboxId: string;
  entityId: string;
  version: number;
  createdAt: Date;
}
