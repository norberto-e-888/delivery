export interface OutboxPrisma {
  id: string;
  exchange: string;
  routingKey: string | null;
  payload: string;
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
}

export interface PrismaService {
  $transaction: (
    callback: (prisma: PrismaClient) => Promise<void>
  ) => Promise<void>;
}
