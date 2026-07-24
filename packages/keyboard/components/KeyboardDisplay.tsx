import type { JSX } from "preact";
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
  showChrome?: boolean;
  labelForLayer?: (layerName: string) => string | null;
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
  labelForLayer,
}: KeyboardDisplayProps): JSX.Element | null {
  if (loading) {
    return (
      <div class="dvk dvk-status">
        <div>Loading keyboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="dvk dvk-status dvk-status--error">
        <div>Error: {error}</div>
      </div>
    );
  }

  if (!layout) {
    return null;
  }

  return (
    <div class={showChrome ? "dvk dvk-center" : "dvk"}>
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
        labelForLayer={labelForLayer}
      />
    </div>
  );
}
