export const SHIFT_KEYS = ["ShiftLeft", "ShiftRight"] as const;
export const ALT_KEYS = ["AltLeft", "AltRight"] as const;
export const CMD_KEYS = ["MetaLeft", "MetaRight"] as const;
export const CTRL_KEYS = ["ControlLeft", "ControlRight"] as const;
export const CAPS_LOCK_KEY = "CapsLock" as const;

export const MOBILE_SYMBOLS_KEY = "MobileSymbols" as const;
export const MOBILE_SYMBOLS2_KEY = "MobileSymbols2" as const;
export const SYMBOLS_KEYS = [MOBILE_SYMBOLS_KEY, MOBILE_SYMBOLS2_KEY] as const;

export const BACKSPACE_KEY = "Backspace" as const;
export const ENTER_KEY = "Enter" as const;
export const TAB_KEY = "Tab" as const;

export const MODIFIER_KEYS = [
  ...SHIFT_KEYS,
  ...ALT_KEYS,
  ...CMD_KEYS,
  ...CTRL_KEYS,
  CAPS_LOCK_KEY,
  ...SYMBOLS_KEYS,
] as const;
