import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import { getActiveLayer, type ModifierState } from "../utils/modifiers.ts";
import {
  getKeyOutput,
  isAltKey,
  isCapsLockKey,
  isCmdKey,
  isCtrlKey,
  isShiftKey,
  isSymbolsKey,
} from "../utils/key-helpers.ts";
import { BACKSPACE_KEY, ENTER_KEY, TAB_KEY } from "../constants/key-ids.ts";

export interface UseKeyboardOptions {
  layout: KeyboardLayout | null;
  onTextOutput?: (text: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
}

export interface UseKeyboardReturn {
  // State
  activeLayer: { value: string };
  pressedKeyId: { value: string | null };
  isShiftActive: { value: boolean };
  isCapsLockActive: { value: boolean };
  isAltActive: { value: boolean };
  isCmdActive: { value: boolean };
  isCtrlActive: { value: boolean };
  isSymbolsActive: { value: boolean };
  isSymbols2Active: { value: boolean };
  pendingDeadkey: { value: string | null };

  // Actions
  handleKeyClick: (key: Key) => void;
  clearState: () => void;
}

export function useKeyboard(options: UseKeyboardOptions): UseKeyboardReturn {
  const { layout, onTextOutput, onBackspace, onClear } = options;

  // State
  const pressedKeyId = useSignal<string | null>(null);

  // Modifier states
  const isShiftActive = useSignal(false);
  const shiftClickMode = useSignal(false); // true if shift was clicked, false if held
  const isCapsLockActive = useSignal(false);
  const isAltActive = useSignal(false);
  const altClickMode = useSignal(false);
  const isCmdActive = useSignal(false);
  const cmdClickMode = useSignal(false);
  const isCtrlActive = useSignal(false);
  const ctrlClickMode = useSignal(false);
  const isSymbolsActive = useSignal(false); // Mobile symbols mode
  const isSymbols2Active = useSignal(false); // Mobile symbols-2 layer toggle

  const pendingDeadkey = useSignal<string | null>(null); // Holds the deadkey character waiting for combination

  // Compute the active layer based on modifier state
  const activeLayer = useComputed(() => {
    // For mobile symbols mode, use symbols-1 or symbols-2
    if (isSymbolsActive.value) {
      return isSymbols2Active.value ? "symbols-2" : "symbols-1";
    }

    // Desktop/normal layers
    const modifiers: ModifierState = {
      shift: isShiftActive.value,
      caps: isCapsLockActive.value,
      alt: isAltActive.value,
      cmd: isCmdActive.value,
      ctrl: isCtrlActive.value,
    };
    return getActiveLayer(modifiers);
  });

  const clearState = () => {
    pendingDeadkey.value = null;
    isShiftActive.value = false;
    shiftClickMode.value = false;
    isCapsLockActive.value = false;
    isAltActive.value = false;
    altClickMode.value = false;
    isCmdActive.value = false;
    cmdClickMode.value = false;
    isCtrlActive.value = false;
    ctrlClickMode.value = false;
    isSymbolsActive.value = false;
    isSymbols2Active.value = false;
    pressedKeyId.value = null;
    onClear?.();
  };

  // Helper: Exit click mode for all modifiers (one-shot modifiers)
  const exitClickModes = () => {
    if (shiftClickMode.value) {
      isShiftActive.value = false;
      shiftClickMode.value = false;
    }
    if (altClickMode.value) {
      isAltActive.value = false;
      altClickMode.value = false;
    }
    if (cmdClickMode.value) {
      isCmdActive.value = false;
      cmdClickMode.value = false;
    }
    if (ctrlClickMode.value) {
      isCtrlActive.value = false;
      ctrlClickMode.value = false;
    }
  };

  // Get deadkey combinations from the layout
  const deadkeyCombinations = layout?.deadkeys ?? {};

  // Helper: Check if a character is a deadkey
  const isDeadkey = (char: string): boolean => {
    return char in deadkeyCombinations;
  };

  // Helper: Get the combination result for deadkey + character
  // Returns the combined character if it exists, otherwise null
  const getDeadkeyCombination = (
    deadkey: string,
    char: string,
  ): string | null => {
    return deadkeyCombinations[deadkey]?.[char] ?? null;
  };

  // Find a key in the layout by its physical key code
  const findKeyByCode = (code: string): Key | undefined => {
    if (!layout) return undefined;
    for (const row of layout.rows) {
      const key = row.keys.find((k) => k.id === code);
      if (key) return key;
    }
    return undefined;
  };

  // Handle physical keyboard input
  useEffect(() => {
    if (!layout) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an editable textarea (not readonly)
      if (e.target instanceof HTMLTextAreaElement && !e.target.readOnly) {
        return;
      }

      e.preventDefault();

      const key = findKeyByCode(e.code);
      if (key) {
        // Handle Shift key specially - activate shift mode but don't call handleKeyClick
        if (isShiftKey(key.id)) {
          pressedKeyId.value = key.id;
          isShiftActive.value = true;
          shiftClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Caps Lock key specially - toggle on each press
        // Don't set pressedKeyId for toggle keys - we show active state instead
        if (isCapsLockKey(key.id)) {
          isCapsLockActive.value = !isCapsLockActive.value;
          return;
        }

        // Handle Alt key - activate alt mode but don't call handleKeyClick
        if (isAltKey(key.id)) {
          pressedKeyId.value = key.id;
          isAltActive.value = true;
          altClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Cmd key - activate cmd mode but don't call handleKeyClick
        if (isCmdKey(key.id)) {
          pressedKeyId.value = key.id;
          isCmdActive.value = true;
          cmdClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Ctrl key - activate ctrl mode but don't call handleKeyClick
        if (isCtrlKey(key.id)) {
          pressedKeyId.value = key.id;
          isCtrlActive.value = true;
          ctrlClickMode.value = false; // Physical hold, not click
          return;
        }

        pressedKeyId.value = key.id;
        handleKeyClick(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an editable textarea (not readonly)
      if (e.target instanceof HTMLTextAreaElement && !e.target.readOnly) {
        return;
      }

      const key = findKeyByCode(e.code);

      if (key) {
        // Release modifiers when physical key is released (if not in click mode)
        if (isShiftKey(key.id) && !shiftClickMode.value) {
          isShiftActive.value = false;
        }
        if (isAltKey(key.id) && !altClickMode.value) {
          isAltActive.value = false;
        }
        if (isCmdKey(key.id) && !cmdClickMode.value) {
          isCmdActive.value = false;
        }
        if (isCtrlKey(key.id) && !ctrlClickMode.value) {
          isCtrlActive.value = false;
        }
      }

      pressedKeyId.value = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [layout]);

  const handleKeyClick = (key: Key) => {
    // Handle Shift key clicks
    if (isShiftKey(key.id)) {
      // In symbols mode, shift toggles between symbols-1 and symbols-2
      if (isSymbolsActive.value) {
        isSymbols2Active.value = !isSymbols2Active.value;
        return;
      }
      // Otherwise, normal shift behavior
      isShiftActive.value = !isShiftActive.value;
      shiftClickMode.value = isShiftActive.value;
      return;
    }

    // Handle Caps Lock key clicks
    if (isCapsLockKey(key.id)) {
      isCapsLockActive.value = !isCapsLockActive.value;
      return;
    }

    // Handle Alt key clicks
    if (isAltKey(key.id)) {
      isAltActive.value = !isAltActive.value;
      altClickMode.value = isAltActive.value;
      return;
    }

    // Handle Cmd key clicks
    if (isCmdKey(key.id)) {
      isCmdActive.value = !isCmdActive.value;
      cmdClickMode.value = isCmdActive.value;
      return;
    }

    // Handle Ctrl key clicks
    if (isCtrlKey(key.id)) {
      isCtrlActive.value = !isCtrlActive.value;
      ctrlClickMode.value = isCtrlActive.value;
      return;
    }

    // Handle mobile symbols key clicks
    if (isSymbolsKey(key.id)) {
      isSymbolsActive.value = !isSymbolsActive.value;
      // Reset symbols-2 when leaving symbols mode
      if (!isSymbolsActive.value) {
        isSymbols2Active.value = false;
      }
      return;
    }

    // Handle special keys
    if (key.id === BACKSPACE_KEY) {
      // If there's a pending deadkey, just cancel it instead of deleting
      if (pendingDeadkey.value !== null) {
        pendingDeadkey.value = null;
      } else {
        onBackspace?.();
      }
      exitClickModes();
      return;
    }

    if (key.id === ENTER_KEY) {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        onTextOutput?.(pendingDeadkey.value);
        pendingDeadkey.value = null;
      }
      onTextOutput?.("\n");
      exitClickModes();
      return;
    }

    if (key.id === TAB_KEY) {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        onTextOutput?.(pendingDeadkey.value);
        pendingDeadkey.value = null;
      }
      onTextOutput?.("\t");
      exitClickModes();
      return;
    }

    // Get the output for this key
    const output = getKeyOutput(key, activeLayer.value);

    // Ignore keys with no output
    if (!output || output === "") {
      return;
    }

    // Get the character that would be output
    const charToAdd = output;

    // Check if we have a pending deadkey
    if (pendingDeadkey.value !== null) {
      const combination = getDeadkeyCombination(
        pendingDeadkey.value,
        charToAdd,
      );
      if (combination !== null) {
        // We have a combination - output the combined character
        onTextOutput?.(combination);
      } else {
        // No combination exists - output deadkey followed by the character
        onTextOutput?.(pendingDeadkey.value + charToAdd);
      }
      pendingDeadkey.value = null;
      exitClickModes();
      return;
    }

    // Check if the current character is a deadkey
    if (isDeadkey(charToAdd)) {
      pendingDeadkey.value = charToAdd;
      exitClickModes();
      return;
    }

    // Normal character - just add it
    onTextOutput?.(charToAdd);

    // Exit click modes (one-shot modifiers)
    exitClickModes();
  };

  return {
    activeLayer,
    pressedKeyId,
    isShiftActive,
    isCapsLockActive,
    isAltActive,
    isCmdActive,
    isCtrlActive,
    isSymbolsActive,
    isSymbols2Active,
    pendingDeadkey,
    handleKeyClick,
    clearState,
  };
}
