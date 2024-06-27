import { RabbitMQMessageAggregate } from '@delivery/utils';

export interface OutboxPrisma {
  id: string;
  exchange: string;
  routingKey: string | null;
  aggregate?: RabbitMQMessageAggregate;
  payload: string;
  createdAt: Date;
}

export interface PrismaClient {
  outbox: {
    findFirst: (args: {
      where: {
        aggregate: {
          path: ['entityId'];
          equals: string;
        };
      };
      select: {
        aggregate: true;
      };
    }) => Promise<OutboxPrisma | null>;
    create: (args: {
      data: {
        exchange: string;
        routingKey: string | null;
        payload: string;
        aggregate: RabbitMQMessageAggregate | null;
      };
    }) => Promise<OutboxPrisma>;
    update: (args: {
      where: { id: string };
      data: { isSent: boolean };
    }) => Promise<OutboxPrisma>;
  };
}

export interface PrismaService {
  $transaction: (
    callback: (prisma: PrismaClient) => Promise<void>
  ) => Promise<void>;
}
