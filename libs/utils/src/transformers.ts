import { TransformFnParams } from 'class-transformer';

export const trim = ({ value }: TransformFnParams) => value.trim();
export const lowercase = ({ value }: TransformFnParams) => value.toLowerCase();
export const toInt = ({ value }: TransformFnParams) => parseInt(value, 10);

const toNDecimalFloat =
  (decimals: number) =>
  ({ value }: TransformFnParams) =>
    parseFloat(value).toFixed(decimals);

export const toTwoDecimalFloat = toNDecimalFloat(2);
