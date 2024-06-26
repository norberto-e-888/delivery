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

export interface PrismaClient {
  outbox: {
    create: (args: {
      data: {
        exchange: string;
        routingKey: string | null;
        payload: string;
      };
    }) => Promise<Outbox>;
    update: (args: {
      where: { id: string };
      data: { isSent: boolean };
    }) => Promise<Outbox>;
  };
  outboxAggregate: {
    create: (args: {
      data: {
        outboxId: string;
        entityId: string;
        version: number;
      };
    }) => Promise<OutboxAggregate>;
    findFirst: (args: {
      where: {
        entityId: string;
      };
      orderBy: {
        version: 'desc';
      };
    }) => Promise<OutboxAggregate | null>;
  };
}

export interface PrismaService {
  $transaction: (
    callback: (prisma: PrismaClient) => Promise<void>
  ) => Promise<void>;
}