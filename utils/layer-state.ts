import type { KeyboardLayout } from "../types/keyboard-simple.ts";

export interface LayerState {
  name: string;
  label: string;
  activeLayer: string;
  isShiftActive: boolean;
  isCapsLockActive: boolean;
  isAltActive: boolean;
  isCmdActive: boolean;
  isCtrlActive: boolean;
  isSymbolsActive: boolean;
  isSymbols2Active: boolean;
}

const LAYER_MODIFIER_MAP: Record<string, Partial<LayerState>> = {
  "default": {},
  "shift": { isShiftActive: true },
  "caps": { isCapsLockActive: true },
  "caps+shift": { isCapsLockActive: true, isShiftActive: true },
  "alt": { isAltActive: true },
  "alt+shift": { isAltActive: true, isShiftActive: true },
  "alt+caps": { isAltActive: true, isCapsLockActive: true },
  "ctrl": { isCtrlActive: true },
  "ctrl+shift": { isCtrlActive: true, isShiftActive: true },
  "cmd": { isCmdActive: true },
  "cmd+shift": { isCmdActive: true, isShiftActive: true },
  "cmd+alt": { isCmdActive: true, isAltActive: true },
  "cmd+alt+shift": { isCmdActive: true, isAltActive: true, isShiftActive: true },
  "symbols-1": { isSymbolsActive: true },
  "symbols-2": { isSymbolsActive: true, isSymbols2Active: true },
};

const LAYER_LABELS: Record<string, string> = {
  "default": "Default",
  "shift": "Shift",
  "caps": "Caps",
  "caps+shift": "Caps + Shift",
  "alt": "Alt",
  "alt+shift": "Alt + Shift",
  "alt+caps": "Alt + Caps",
  "ctrl": "Ctrl",
  "ctrl+shift": "Ctrl + Shift",
  "cmd": "Cmd",
  "cmd+shift": "Cmd + Shift",
  "cmd+alt": "Cmd + Alt",
  "cmd+alt+shift": "Cmd + Alt + Shift",
  "symbols-1": "Symbols",
  "symbols-2": "Symbols 2",
};

const LAYER_ORDER = [
  "default",
  "shift",
  "caps",
  "caps+shift",
  "alt",
  "alt+shift",
  "alt+caps",
  "ctrl",
  "ctrl+shift",
  "cmd",
  "cmd+shift",
  "cmd+alt",
  "cmd+alt+shift",
  "symbols-1",
  "symbols-2",
];

export function enumerateLayers(layout: KeyboardLayout): LayerState[] {
  const layerNamesWithData = new Set<string>(["default"]);

  for (const row of layout.rows) {
    for (const key of row.keys) {
      for (const layerName of Object.keys(key.layers)) {
        layerNamesWithData.add(layerName);
      }
    }
  }

  return LAYER_ORDER
    .filter((name) => layerNamesWithData.has(name))
    .map((name) => ({
      name,
      label: LAYER_LABELS[name] || name,
      activeLayer: name,
      isShiftActive: false,
      isCapsLockActive: false,
      isAltActive: false,
      isCmdActive: false,
      isCtrlActive: false,
      isSymbolsActive: false,
      isSymbols2Active: false,
      ...(LAYER_MODIFIER_MAP[name] || {}),
    }));
}

/** Convert a layer name to a CSS-safe identifier fragment */
export function layerNameToId(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "-");
}
