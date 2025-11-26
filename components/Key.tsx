import type { Key as KeyType } from "../types/keyboard-simple.ts";

interface KeyProps {
  keyData: KeyType;
  onClick?: (key: KeyType) => void;
  isPressed?: boolean;
}

export function Key({ keyData, onClick, isPressed }: KeyProps) {
  const width = keyData.width ?? 1.0;
  const height = keyData.height ?? 1.0;
  const type = keyData.type ?? "normal";
  const label = keyData.label ?? keyData.output;

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
          : "bg-white border-gray-300 hover:bg-gray-100 active:bg-gray-200"
        }
        ${type === "modifier" && !isPressed ? "bg-gray-50 text-gray-600 font-semibold" : ""}
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
