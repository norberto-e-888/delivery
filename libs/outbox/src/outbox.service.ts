import { CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Outbox, OutboxAggregate, OutboxDocument } from './outbox.schema';
import { Model, ClientSession, Schema, Types } from 'mongoose';
import { inspect } from 'util';
import { PublishOutboxCommand } from './publish.command';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(Outbox.name) private readonly outbox: Model<OutboxDocument>,
    private readonly commandBus: CommandBus
  ) {}

  async publish<T>(
    writes: (session: ClientSession) => Promise<T>,
    message: {
      exchange: string;
      routingKey?: string;
    },
    options: {
      transformPayload?:
        | ((result: T) => Promise<unknown>)
        | ((result: T) => unknown);
      aggregate?: {
        collection: string;
        entityIdKey: string;
      };
    } = {}
  ) {
    const session = await this.outbox.startSession();

    let returnData: Awaited<T> | null = null;
    let returnOutbox: OutboxDocument | null = null;

    try {
      await session.withTransaction(
        async () => {
          const data = await writes(session);

          let payload: string;
          let aggregate: OutboxAggregate | null = null;

          if (options?.transformPayload) {
            payload = JSON.stringify(await options.transformPayload(data));
          } else {
            payload = data ? JSON.stringify(data) : '{}';
          }

          if (options.aggregate) {
            const collection = this.outbox.db.collection(
              options.aggregate.collection
            );

            if (!collection) {
              throw new Error(
                `Collection ${options.aggregate.collection} not found`
              );
            }

            const path = options.aggregate.entityIdKey.split('.');
            const parsedPayload = JSON.parse(payload);
            const entityId = path.reduce((curr, key, i) => {
              if (curr === null || typeof curr !== 'object') {
                throw new Error(
                  `Key ${key} at position ${i + 1} from path ${
                    options.aggregate?.entityIdKey
                  } does not resolve to a valid object`
                );
              }

              return curr[key];
            }, parsedPayload);

            if (typeof entityId !== 'string') {
              throw new Error(
                `Path ${
                  options.aggregate.entityIdKey
                } does not resolve to a string. Got type ${typeof entityId} instead`
              );
            }

            const document = (await collection.findOne({
              _id: Types.ObjectId.createFromHexString(entityId),
            })) as unknown as {
              _id: Schema.Types.ObjectId;
              _version?: number;
            };

            if (!document) {
              aggregate = {
                entityId,
                version: 1,
              };
            } else {
              await collection.findOneAndUpdate(
                {
                  _id: new Types.ObjectId(entityId),
                },
                typeof document._version === 'number'
                  ? {
                      $inc: { _version: 1 },
                    }
                  : { _version: 1 },
                {
                  session,
                }
              );

              aggregate = {
                entityId,
                version: document._version ? document._version + 1 : 1,
              };
            }
          }

          const [outbox] = await this.outbox.create(
            [
              {
                exchange: message.exchange,
                routingKey: message.routingKey || '',
                payload,
                aggregate,
              },
            ],
            { session }
          );

          returnData = data;
          returnOutbox = outbox;
        },
        {
          readPreference: 'primary',
          readConcern: { level: 'local' },
          writeConcern: { w: 'majority' },
        }
      );
    } catch (error) {
      this.logger.error(`Error with Outbox transaction: ${inspect(error)}`);
      throw error;
    } finally {
      await session.endSession();
    }

    if (returnOutbox !== null) {
      this.commandBus
        .execute(new PublishOutboxCommand(returnOutbox))
        .then(() => {
          this.logger.verbose(
            `Successfully executed PublishOutboxCommand for message with Id ${returnOutbox?.id}`
          );
        })
        .catch((error) => {
          this.logger.error(
            `Error executing PublishOutboxCommand for message with Id ${
              returnOutbox?.id
            }: ${inspect(error)}`
          );
        });
    }

    return returnData;
  }
}
