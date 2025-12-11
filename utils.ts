import { createDefine } from "fresh";

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
 * Decodes Unicode escape sequences like \u{304} to their actual characters
 */
export function decodeUnicodeEscapes(str: string): string {
  // Match \u{XXXX} pattern where XXXX is hex digits
  return str.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
    return String.fromCodePoint(parseInt(hex, 16));
  });
}
