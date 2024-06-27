import { RabbitMQMessageAggregate } from '@delivery/utils';

export interface OutboxPrisma {
  id: string;
  exchange: string;
  routingKey: string | null;
  payload: string;
  createdAt: Date;
}

export interface OutboxPrismaAggregate extends RabbitMQMessageAggregate {
  outboxId: string;
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
    }) => Promise<OutboxPrisma>;
    update: (args: {
      where: { id: string };
      data: { isSent: boolean };
    }) => Promise<OutboxPrisma>;
  };
  outboxAggregate: {
    create: (args: {
      data: {
        outboxId: string;
        entityId: string;
        version: number;
      };
    }) => Promise<OutboxPrismaAggregate>;
    findFirst: (args: {
      where: {
        entityId: string;
      };
      orderBy: {
        version: 'desc';
      };
    }) => Promise<OutboxPrismaAggregate | null>;
  };
}

export interface PrismaService {
  $transaction: (
    callback: (prisma: PrismaClient) => Promise<void>
  ) => Promise<void>;
}
