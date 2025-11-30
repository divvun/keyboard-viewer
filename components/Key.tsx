import type { Key as KeyType } from "../types/keyboard-simple.ts";

interface KeyProps {
  keyData: KeyType;
  onClick?: (key: KeyType) => void;
  isPressed?: boolean;
  isShiftActive?: boolean;
  isCapsLockActive?: boolean;
  pendingDeadkey?: string | null;
}

export function Key(
  {
    keyData,
    onClick,
    isPressed,
    isShiftActive,
    isCapsLockActive,
    pendingDeadkey,
  }: KeyProps,
) {
  const width = keyData.width ?? 1.0;
  const height = keyData.height ?? 1.0;
  const type = keyData.type ?? "normal";

  // Determine which label to show based on shift and caps lock state
  let label: string;
  // Use Unicode property escape to match all lowercase letters (including accented and non-Latin)
  const isLetter = keyData.output.length === 1 &&
    /\p{Ll}/u.test(keyData.output);

  if (isLetter) {
    // For letters, show uppercase if caps lock XOR shift is active
    const shouldBeUppercase = isCapsLockActive !== isShiftActive;
    label = shouldBeUppercase ? keyData.output.toUpperCase() : keyData.output;
  } else if (isShiftActive && keyData.shiftLabel) {
    label = keyData.shiftLabel;
  } else if (isShiftActive && keyData.shiftOutput) {
    label = keyData.shiftOutput;
  } else {
    label = keyData.label ?? keyData.output;
  }

  // Check if this is a Shift key
  const isShiftKey = keyData.id === "ShiftLeft" || keyData.id === "ShiftRight";

  // Check if this is the Caps Lock key
  const isCapsLockKey = keyData.id === "CapsLock";

  // Check if this key is the pending deadkey
  // A key is the pending deadkey if its output (normal or shift) matches the pending deadkey character
  const isPendingDeadkey = pendingDeadkey !== null &&
    (keyData.output === pendingDeadkey ||
      keyData.shiftOutput === pendingDeadkey);

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
  const isActive = isPressed || (isShiftKey && isShiftActive) ||
    (isCapsLockKey && isCapsLockActive) || isPendingDeadkey;

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
