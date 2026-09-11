export function assertNoCatalogErrors(errors: readonly string[]): void {
  if (errors.length) throw new Error(`Invalid fairground catalog:\n- ${errors.join("\n- ")}`);
}
