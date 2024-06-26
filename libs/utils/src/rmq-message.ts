export interface RMQMessage<D> {
  data: D;
  aggregate: {
    entityId: string;
    version: number;
  } | null;
}
