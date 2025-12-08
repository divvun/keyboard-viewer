import type {
  Key as KeyType,
  KeyboardLayout as LayoutType,
} from "../types/keyboard-simple.ts";
import { Key } from "./Key.tsx";
import { ENTER_KEY } from "../constants/key-ids.ts";

interface KeyboardLayoutProps {
  layout: LayoutType;
  onKeyClick?: (key: KeyType) => void;
  pressedKeyId?: string | null;
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

export function KeyboardLayout({
  layout,
  onKeyClick,
  pressedKeyId,
  activeLayer,
  isShiftActive,
  isCapsLockActive,
  isAltActive,
  isCmdActive,
  isCtrlActive,
  isSymbolsActive,
  isSymbols2Active,
  pendingDeadkey,
}: KeyboardLayoutProps) {
  const baseWidth = 3.5; // rem - matches Key component
  const gap = 0.25; // rem - gap between keys

  // Find the ISO Enter key and calculate its position
  let enterKeyInfo:
    | { rowIndex: number; leftOffset: number; width: number; enterKey: KeyType }
    | null = null;

  // First, find the Enter key and calculate max row width
  let enterKeyRowIndex = -1;
  let maxRowWidth = 0;

  layout.rows.forEach((row, rowIndex) => {
    const rowOffset = (row.offset ?? 0) * (baseWidth + gap);
    let rowWidth = rowOffset;
    const numGaps = row.keys.length - 1;

    row.keys.forEach((key) => {
      if (key.id === ENTER_KEY && key.height && key.height > 1) {
        enterKeyRowIndex = rowIndex;
      }
      rowWidth += (key.width ?? 1.0) * baseWidth;
    });
    rowWidth += numGaps * gap;

    if (rowWidth > maxRowWidth) {
      maxRowWidth = rowWidth;
    }
  });

  // If we found an Enter key, position it at the end of the next row (ASDF)
  // (The asdf row is longer than the qwerty row, so use it to prevent overlap)
  if (enterKeyRowIndex !== -1) {
    const asdfRowIndex = enterKeyRowIndex + 1; // ASDF row is one below QWERTY
    const asdfRow = layout.rows[asdfRowIndex];

    if (asdfRow) {
      // Calculate ASDF row width (without Enter)
      const rowOffset = (asdfRow.offset ?? 0) * (baseWidth + gap);
      let asdfRowWidth = rowOffset;
      const numGaps = asdfRow.keys.length - 1;

      asdfRow.keys.forEach((key) => {
        asdfRowWidth += (key.width ?? 1.0) * baseWidth;
      });
      asdfRowWidth += numGaps * gap;

      // Enter key width is the difference
      const enterWidth = (maxRowWidth - asdfRowWidth - gap) / baseWidth;
      const enterKey = layout.rows[enterKeyRowIndex].keys.find((k) =>
        k.id === ENTER_KEY
      );

      if (enterKey) {
        enterKeyInfo = {
          rowIndex: enterKeyRowIndex,
          leftOffset: asdfRowWidth + gap,
          width: enterWidth,
          enterKey: { ...enterKey, width: enterWidth },
        };
      }
    }
  }

  return (
    <div class="inline-block p-4 bg-gray-200 rounded-lg shadow-lg">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          gap: `${gap}rem`,
        }}
      >
        {layout.rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            class={`flex ${
              layout.isMobile || rowIndex === layout.rows.length - 1
                ? "justify-center"
                : ""
            }`}
            style={{
              gap: `${gap}rem`,
              marginLeft: row.offset
                ? `${row.offset * (baseWidth + gap)}rem`
                : "0",
            }}
          >
            {row.keys.map((key) => {
              // Skip ISO Enter in normal flow - it's rendered absolutely below
              if (key.id === ENTER_KEY && key.height && key.height > 1) {
                return null;
              }

              return (
                <Key
                  key={key.id}
                  keyData={key}
                  onClick={onKeyClick}
                  isPressed={pressedKeyId === key.id}
                  activeLayer={activeLayer}
                  isShiftActive={isShiftActive}
                  isCapsLockActive={isCapsLockActive}
                  isAltActive={isAltActive}
                  isCmdActive={isCmdActive}
                  isCtrlActive={isCtrlActive}
                  isSymbolsActive={isSymbolsActive}
                  isSymbols2Active={isSymbols2Active}
                  pendingDeadkey={pendingDeadkey}
                />
              );
            })}
          </div>
        ))}

        {/* Render ISO Enter key absolutely positioned */}
        {enterKeyInfo && (
          <div
            style={{
              position: "absolute",
              left: `${enterKeyInfo.leftOffset}rem`,
              top: `${enterKeyInfo.rowIndex * (baseWidth + gap)}rem`,
              zIndex: 10,
            }}
          >
            <Key
              keyData={enterKeyInfo.enterKey}
              onClick={onKeyClick}
              isPressed={pressedKeyId === enterKeyInfo.enterKey.id}
              activeLayer={activeLayer}
              isShiftActive={isShiftActive}
              isCapsLockActive={isCapsLockActive}
              isAltActive={isAltActive}
              isCmdActive={isCmdActive}
              isCtrlActive={isCtrlActive}
              isSymbolsActive={isSymbolsActive}
              isSymbols2Active={isSymbols2Active}
              pendingDeadkey={pendingDeadkey}
            />
          </div>
        )}
      </div>
    </div>
  );
}
