/** Shape Nest's built-in exceptions use for `getResponse()` when it is an object. */
export interface HttpExceptionBody {
  readonly message?: string | readonly string[];
  readonly error?: string;
  readonly statusCode?: number;
}
