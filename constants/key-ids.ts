export const SHIFT_KEYS = ["ShiftLeft", "ShiftRight"] as const;
export const ALT_KEYS = ["AltLeft", "AltRight"] as const;
export const CMD_KEYS = ["MetaLeft", "MetaRight"] as const;
export const CTRL_KEYS = ["ControlLeft", "ControlRight"] as const;
export const CAPS_LOCK_KEY = "CapsLock" as const;
export const SYMBOLS_KEYS = ["MobileSymbols", "MobileSymbols2"] as const;
export const MODIFIER_KEYS = [
  ...SHIFT_KEYS,
  ...ALT_KEYS,
  ...CMD_KEYS,
  ...CTRL_KEYS,
  CAPS_LOCK_KEY,
  ...SYMBOLS_KEYS,
] as const;

export const FUNCTION_KEYS = {
  BACKSPACE: "Backspace",
  ENTER: "Enter",
  TAB: "Tab",
  SPACE: "Space",
  ESCAPE: "Escape",
} as const;
