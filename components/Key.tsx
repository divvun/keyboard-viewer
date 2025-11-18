import type { Key as KeyType } from "../types/keyboard-simple.ts";

interface KeyProps {
  keyData: KeyType;
  onClick?: (key: KeyType) => void;
}

export function Key({ keyData, onClick }: KeyProps) {
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

  // Special styling for ISO Enter key (backwards L shape)
  const isISOEnter = keyData.id === "Enter" && height > 1;

  return (
    <button
      onClick={handleClick}
      style={style}
      class={`
        relative
        rounded
        border-2 border-gray-300
        bg-white
        hover:bg-gray-100
        active:bg-gray-200
        shadow-sm
        hover:shadow-md
        transition-all
        font-mono
        text-sm
        cursor-pointer
        select-none
        flex items-center justify-center
        ${type === "modifier" ? "bg-gray-50 text-gray-600 font-semibold" : ""}
        ${type === "space" ? "bg-gray-50" : ""}
        ${type === "function" ? "bg-blue-50 text-blue-700 text-xs" : ""}
        ${isISOEnter ? "iso-enter" : ""}
      `}
      title={keyData.id}
    >
      {label}
    </button>
  );
}
