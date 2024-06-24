import { CqrsModule } from '@nestjs/cqrs';
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Outbox, OutboxSchema } from './outbox.schema';
import { OutboxService } from './outbox.service';
import { OutboxPublisherHandler } from './publish.command';

@Global()
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: Outbox.name, schema: OutboxSchema }]),
  ],
  providers: [OutboxPublisherHandler, OutboxService],
  exports: [OutboxService],
})
export class OutboxPublisherModule {}
