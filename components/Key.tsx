import type { Key as KeyType } from "../types/keyboard-simple.ts";

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
  pendingDeadkey?: string | null;
}

/**
 * Gets the output character for a key in the active layer,
 * with fallback logic if the layer doesn't exist.
 */
function getKeyOutput(keyData: KeyType, activeLayer: string): string {
  // Try to get the character from the active layer
  const output = keyData.layers[activeLayer as keyof typeof keyData.layers];
  if (output !== undefined) {
    return output;
  }

  // Fallback to default layer
  return keyData.layers.default;
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
    pendingDeadkey,
  }: KeyProps,
) {
  const width = keyData.width ?? 1.0;
  const height = keyData.height ?? 1.0;
  const type = keyData.type ?? "normal";

  // Get the output character for the active layer
  const output = getKeyOutput(keyData, activeLayer);

  // Determine the label to display
  const label = keyData.label ?? output;

  // Check if this is a modifier key
  const isShiftKey = keyData.id === "ShiftLeft" || keyData.id === "ShiftRight";
  const isCapsLockKey = keyData.id === "CapsLock";
  const isAltKey = keyData.id === "AltLeft" || keyData.id === "AltRight";
  const isCmdKey = keyData.id === "MetaLeft" || keyData.id === "MetaRight";
  const isCtrlKey = keyData.id === "ControlLeft" ||
    keyData.id === "ControlRight";

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
  const gap = 0.25; // gap between keys

  // Check if key should show active state
  const isActive = isPressed ||
    (isShiftKey && isShiftActive) ||
    (isCapsLockKey && isCapsLockActive) ||
    (isAltKey && isAltActive) ||
    (isCmdKey && isCmdActive) ||
    (isCtrlKey && isCtrlActive) ||
    isPendingDeadkey;

  const style = {
    width: `${width * baseWidth}rem`,
    height: `${height * baseHeight}rem`,
  };

  return (
    <button
      onClick={handleClick}
      style={style}
      class={`
        relative
        rounded
        border-2
        shadow-sm
        hover:shadow-md
        transition-all
        font-mono
        cursor-pointer
        select-none
        flex items-center justify-center
        ${
        isActive ? "key-active" : "bg-white border-gray-300 hover:bg-gray-200"
      }
        ${type === "function" ? "text-xs" : "text-sm"}
      `}
      title={keyData.id}
    >
      {label}
    </button>
  );
}
