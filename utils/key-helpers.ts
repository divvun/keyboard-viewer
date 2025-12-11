import type { Key } from "../types/keyboard-simple.ts";
import {
  ALT_KEYS,
  BACKSPACE_KEY,
  CAPS_LOCK_KEY,
  CMD_KEYS,
  CTRL_KEYS,
  ENTER_KEY,
  MOBILE_SYMBOLS2_KEY,
  SHIFT_KEYS,
  SYMBOLS_KEYS,
  TAB_KEY,
} from "../constants/key-ids.ts";
import { decodeUnicodeEscapes } from "../utils.ts";

export function isShiftKey(keyId: string): boolean {
  return SHIFT_KEYS.some((k) => k === keyId);
}

export function isCapsLockKey(keyId: string): boolean {
  return keyId === CAPS_LOCK_KEY;
}

export function isAltKey(keyId: string): boolean {
  return ALT_KEYS.some((k) => k === keyId);
}

export function isCmdKey(keyId: string): boolean {
  return CMD_KEYS.some((k) => k === keyId);
}

export function isCtrlKey(keyId: string): boolean {
  return CTRL_KEYS.some((k) => k === keyId);
}

export function isSymbolsKey(keyId: string): boolean {
  return SYMBOLS_KEYS.some((k) => k === keyId);
}

export function isSymbols2Key(keyId: string): boolean {
  return keyId === MOBILE_SYMBOLS2_KEY;
}

export function isModifierKey(keyId: string): boolean {
  return (
    isShiftKey(keyId) ||
    isCapsLockKey(keyId) ||
    isAltKey(keyId) ||
    isCmdKey(keyId) ||
    isCtrlKey(keyId) ||
    isSymbolsKey(keyId)
  );
}

export function isFunctionKey(keyId: string): boolean {
  return (
    isModifierKey(keyId) ||
    keyId === TAB_KEY ||
    keyId === ENTER_KEY ||
    keyId === BACKSPACE_KEY
  );
}

export function getKeyOutput(key: Key, layer: string): string {
  if (!key.layers) {
    return "";
  }

  const output = key.layers[layer as keyof typeof key.layers];
  if (output !== undefined) {
    return decodeUnicodeEscapes(output);
  }

  // Special fallback for symbols-2: try symbols-1 before default
  if (layer === "symbols-2" && key.layers["symbols-1"]) {
    return decodeUnicodeEscapes(key.layers["symbols-1"]);
  }

  return decodeUnicodeEscapes(key.layers.default || "");
}
