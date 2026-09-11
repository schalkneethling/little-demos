/** Failed module fetches can remain rejected in the browser module registry. */
export class DemoImportError extends Error {
  constructor(cause: unknown) {
    super("The demo module could not be imported.", { cause });
    this.name = "DemoImportError";
  }
}
