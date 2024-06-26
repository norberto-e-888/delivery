import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxPrismaPublisher } from './publish.command';
import { OutboxPostgresService } from './outbox.service';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [OutboxPrismaPublisher, OutboxPostgresService],
  exports: [OutboxPostgresService],
})
export class AppOutboxPostgresModule {}
