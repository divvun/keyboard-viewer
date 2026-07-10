/**
 * Decodes Unicode escape sequences like \u{304} to their actual characters
 */
export function decodeUnicodeEscapes(str: string): string {
  // Match \u{XXXX} pattern where XXXX is hex digits
  return str.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => {
    return String.fromCodePoint(parseInt(hex, 16));
  });
}
