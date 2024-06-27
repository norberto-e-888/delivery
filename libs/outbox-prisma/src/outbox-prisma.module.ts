import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { OutboxPrismaService } from './outbox-prisma.service';
import { OutboxPrismaPublisher } from './publish.command';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [OutboxPrismaPublisher, OutboxPrismaService],
  exports: [OutboxPrismaService],
})
export class OutboxPrismaModule {}
