export const removeArrayDuplicates = <T>(array: T[]): Array<T> =>
  Array.from(new Set(array));
