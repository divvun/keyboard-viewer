import type { Key as KeyType } from "../types/keyboard-simple.ts";
import {
  getKeyOutput,
  isAltKey,
  isCapsLockKey,
  isCmdKey,
  isCtrlKey,
  isFunctionKey,
  isShiftKey,
  isSymbolsKey,
} from "../utils/key-helpers.ts";
import { decodeUnicodeEscapes } from "../utils.ts";

interface KeyProps {
  keyData: KeyType;
  onClick?: (key: KeyType) => void;
  isPressed?: boolean;
  activeLayer: string;
  isShiftActive?: boolean;
  isCapsLockActive?: boolean;
  isAltActive?: boolean;
  isCmdActive?: boolean;
  isCtrlActive?: boolean;
  isSymbolsActive?: boolean;
  isSymbols2Active?: boolean;
  pendingDeadkey?: string | null;
}

export function Key(
  {
    keyData,
    onClick,
    isPressed,
    activeLayer,
    isShiftActive,
    isCapsLockActive,
    isAltActive,
    isCmdActive,
    isCtrlActive,
    isSymbolsActive,
    isSymbols2Active,
    pendingDeadkey,
  }: KeyProps,
) {
  const width = keyData.width ?? 1.0;
  const height = keyData.height ?? 1.0;
  const type = keyData.type ?? "normal";

  // Get the output character for the active layer
  const output = getKeyOutput(keyData, activeLayer);

  // Check modifier key types
  const isShift = isShiftKey(keyData.id);
  const isSymbols = isSymbolsKey(keyData.id);

  // Determine the label to display
  let label = keyData.label ?? output;

  // Dynamic label for symbols key: "123" when in letter mode, "ABC" when in symbols mode
  if (isSymbols) {
    label = isSymbolsActive ? "ABC" : "123";
  }

  // Dynamic label for shift key in symbols mode
  if (isShift && isSymbolsActive) {
    // When in symbols-2 (symbols-2 is active), show "123" to return to symbols-1
    // When in symbols-1 (symbols-2 is not active), show "#+=" to go to symbols-2
    label = isSymbols2Active ? "123" : "#+=";
  }

  // Decode Unicode escape sequences like \u{304}
  label = decodeUnicodeEscapes(label);

  // Check if this key produces the pending deadkey in any layer
  const isPendingDeadkey = pendingDeadkey !== null &&
    Object.values(keyData.layers).some((char) => char === pendingDeadkey);

  const handleClick = () => {
    if (onClick) {
      onClick(keyData);
    }
  };

  // Base key width and height in rem
  const baseWidth = 3.5; // rem
  const baseHeight = 3.5; // rem

  // Check if key should show active state
  const isActive = isPressed ||
    (isShift && (isSymbolsActive ? isSymbols2Active : isShiftActive)) ||
    (isCapsLockKey(keyData.id) && isCapsLockActive) ||
    (isAltKey(keyData.id) && isAltActive) ||
    (isCmdKey(keyData.id) && isCmdActive) ||
    (isCtrlKey(keyData.id) && isCtrlActive) ||
    (isSymbols && isSymbolsActive) ||
    isPendingDeadkey;

  // Check if this is an icon label (like ⌫, ⌘, etc.)
  const isIconLabel = label.match(/^[⌫⌘⇧⌃⌥⇪⏎]$/);

  const style = {
    width: `${width * baseWidth}rem`,
    height: `${height * baseHeight}rem`,
    touchAction: "manipulation", // Prevent 300ms tap delay on mobile
  };

  return (
    <button
      onClick={handleClick}
      style={style}
      class={`
        relative
        rounded-lg
        border-2
        shadow-sm
        hover:shadow-md
        transition-shadow
        font-mono
        cursor-pointer
        select-none
        flex items-center justify-center
        ${
        isActive ? "key-active" : "bg-white border-gray-300 hover:bg-gray-200"
      }
        ${
        isIconLabel
          ? "kbd-icon"
          : isFunctionKey(keyData.id)
          ? "text-sm"
          : "text-xl"
      }
      `}
      title={keyData.id}
    >
      {label}
    </button>
  );
}
