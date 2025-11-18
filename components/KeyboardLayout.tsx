import type { KeyboardLayout as LayoutType, Key as KeyType } from "../types/keyboard-simple.ts";
import { Key } from "./Key.tsx";

interface KeyboardLayoutProps {
  layout: LayoutType;
  onKeyClick?: (key: KeyType) => void;
}

export function KeyboardLayout({ layout, onKeyClick }: KeyboardLayoutProps) {
  const baseWidth = 3.5; // rem - matches Key component
  const gap = 0.25; // rem - gap between keys

  return (
    <div class="inline-block p-4 bg-gray-200 rounded-lg shadow-lg">
      <div class="flex flex-col" style={{ gap: `${gap}rem` }}>
        {layout.rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            class="flex"
            style={{
              gap: `${gap}rem`,
              marginLeft: row.offset ? `${row.offset * (baseWidth + gap)}rem` : "0",
            }}
          >
            {row.keys.map((key) => (
              <Key key={key.id} keyData={key} onClick={onKeyClick} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
