import type { Key } from "../types/keyboard-simple.ts";
import {
  ALT_KEYS,
  CAPS_LOCK_KEY,
  CMD_KEYS,
  CTRL_KEYS,
  MOBILE_SYMBOLS2_KEY,
  SHIFT_KEYS,
  SYMBOLS_KEYS,
} from "../constants/key-ids.ts";

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

export function getKeyOutput(key: Key, layer: string): string {
  if (!key.layers) {
    return "";
  }

  const output = key.layers[layer as keyof typeof key.layers];
  if (output !== undefined) {
    return output;
  }

  // Special fallback for symbols-2: try symbols-1 before default
  if (layer === "symbols-2" && key.layers["symbols-1"]) {
    return key.layers["symbols-1"];
  }

  return key.layers.default || "";
}
