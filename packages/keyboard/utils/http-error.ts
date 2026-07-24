/**
 * Base class for errors that carry a meaningful HTTP status code — thrown by
 * this package's fetch/lookup helpers (`fetchKbdgenData`, `listLayoutFiles`,
 * `buildKeyboardComboTree`, ...) when requested data legitimately doesn't
 * exist upstream on GitHub. A route handler can `instanceof HttpError`-check
 * once to translate any of them into the right `Response` status, without
 * importing or enumerating every specific subclass.
 */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = new.target.name;
  }
}
