import { createDefine } from "fresh";
import { HttpError } from "@divvun/keyboard";

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  shared: string;
}

export const define = createDefine<State>();

/**
 * Safely extracts an error message from an unknown error value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Extracts an HTTP status code from an unknown error value. `@divvun/keyboard`'s
 * fetch/lookup helpers throw `HttpError` subclasses (`LayoutNotFoundError`,
 * `LayoutsDirectoryNotFoundError`, ...) for data that legitimately doesn't
 * exist upstream — checking the shared base class here means a route stays
 * correct as new subclasses are added deeper in the call graph it depends on,
 * without needing to import and enumerate each one. Falls back to 500 for
 * anything else.
 */
export function getErrorStatus(error: unknown, fallback = 500): number {
  return error instanceof HttpError ? error.status : fallback;
}
