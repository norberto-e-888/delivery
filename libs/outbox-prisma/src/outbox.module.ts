import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxPrismaPublisher } from './publish.command';
import { OutboxPrismaService } from './outbox.service';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [OutboxPrismaPublisher, OutboxPrismaService],
  exports: [OutboxPrismaService],
})
export class AppOutboxPrismaModule {}
