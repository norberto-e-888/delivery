export type RoutingKeyGenerators = {
  producer: (...args: string[]) => string;
  consumer: (...args: string[]) => string;
};
