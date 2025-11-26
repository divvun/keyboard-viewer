import type { Key as KeyType } from "../types/keyboard-simple.ts";

interface KeyProps {
  keyData: KeyType;
  onClick?: (key: KeyType) => void;
  isPressed?: boolean;
  isShiftActive?: boolean;
}

export function Key({ keyData, onClick, isPressed, isShiftActive }: KeyProps) {
  const width = keyData.width ?? 1.0;
  const height = keyData.height ?? 1.0;
  const type = keyData.type ?? "normal";

  // Determine which label to show based on shift state
  let label: string;
  if (isShiftActive && keyData.shiftLabel) {
    label = keyData.shiftLabel;
  } else if (isShiftActive && keyData.shiftOutput) {
    label = keyData.shiftOutput;
  } else {
    label = keyData.label ?? keyData.output;
  }

  // Check if this is a Shift key
  const isShiftKey = keyData.id === "ShiftLeft" || keyData.id === "ShiftRight";

  const handleClick = () => {
    if (onClick) {
      onClick(keyData);
    }
  };

  // Base key width and height in rem
  const baseWidth = 3.5; // rem
  const baseHeight = 3.5; // rem
  const gap = 0.25; // gap between keys

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
        text-sm
        cursor-pointer
        select-none
        flex items-center justify-center
        ${isPressed
          ? "bg-blue-500 text-white border-blue-600 shadow-inner"
          : isShiftKey && isShiftActive
          ? "bg-yellow-200 text-gray-800 border-yellow-400"
          : "bg-white border-gray-300 hover:bg-gray-100 active:bg-gray-200"
        }
        ${type === "modifier" && !isPressed && !(isShiftKey && isShiftActive) ? "bg-gray-50 text-gray-600 font-semibold" : ""}
        ${type === "space" && !isPressed ? "bg-gray-50" : ""}
        ${type === "function" && !isPressed ? "bg-blue-50 text-blue-700 text-xs" : ""}
        ${type === "modifier" || type === "function" ? "font-semibold" : ""}
      `}
      title={keyData.id}
    >
      {label}
    </button>
  );
}
