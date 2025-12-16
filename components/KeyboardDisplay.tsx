import { KeyboardLayout } from "./KeyboardLayout.tsx";
import type {
  Key,
  KeyboardLayout as LayoutType,
} from "../types/keyboard-simple.ts";

interface KeyboardDisplayProps {
  layout: LayoutType | null;
  loading?: boolean;
  error?: string | null;
  onKeyClick?: (key: Key) => void;
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
  showChrome?: boolean; // whether to show padding/background
}

export function KeyboardDisplay({
  layout,
  loading,
  error,
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
  showChrome = true,
}: KeyboardDisplayProps) {
  if (loading) {
    return (
      <div class="flex items-center justify-center p-8">
        <div class="text-gray-600">Loading keyboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="flex items-center justify-center p-8">
        <div class="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  return (
    <div class={showChrome ? "flex justify-center items-center" : ""}>
      <KeyboardLayout
        layout={layout}
        onKeyClick={onKeyClick}
        pressedKeyId={pressedKeyId ?? null}
        activeLayer={activeLayer}
        isShiftActive={isShiftActive}
        isCapsLockActive={isCapsLockActive}
        isAltActive={isAltActive}
        isCmdActive={isCmdActive}
        isCtrlActive={isCtrlActive}
        isSymbolsActive={isSymbolsActive}
        isSymbols2Active={isSymbols2Active}
        pendingDeadkey={pendingDeadkey ?? null}
      />
    </div>
  );
}
