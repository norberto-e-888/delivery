import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OutboxPublisherHandler } from './publish.command';
import { OutboxPostgresService } from './outbox.service';

@Module({
  imports: [CqrsModule],
  providers: [OutboxPublisherHandler, OutboxPostgresService],
  exports: [OutboxPostgresService],
})
export class AppOutboxPostgresModule {}
