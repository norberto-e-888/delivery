export const validateEnumArray = (
  enumType: Record<string, string>,
  errorMessage = 'Invalid enum array.'
) => ({
  validator: (v: string[]) =>
    v.every((s) => Object.values(enumType).includes(s)),
  message: errorMessage,
});
