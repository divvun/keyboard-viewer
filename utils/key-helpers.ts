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
import { getLayerFallbackChain } from "./modifiers.ts";

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

  // Use the fallback chain to find the first available layer
  const fallbackChain = getLayerFallbackChain(layer);

  for (const fallbackLayer of fallbackChain) {
    const output = key.layers[fallbackLayer as keyof typeof key.layers];
    if (output !== undefined) {
      return decodeUnicodeEscapes(output);
    }
  }

  // Final fallback (should not reach here if "default" is in the chain)
  return "";
}
