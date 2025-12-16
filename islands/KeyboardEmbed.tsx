import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardDisplay } from "../components/KeyboardDisplay.tsx";
import { useKeyboard } from "../hooks/useKeyboard.ts";
import { useKeyboardScaling } from "../hooks/useKeyboardScaling.ts";
import { buildKeyboardApiUrl } from "../utils/keyboard-params.ts";
import { getErrorMessage } from "../utils.ts";

interface KeyboardEmbedProps {
  kbd: string;
  layout: string;
  platform: string;
  variant: string;
  interactive: boolean;
}

export function KeyboardEmbed({
  kbd,
  layout,
  platform,
  variant,
  interactive,
}: KeyboardEmbedProps) {
  const keyboardLayout = useSignal<KeyboardLayout | null>(null);
  const loading = useSignal<boolean>(true);
  const error = useSignal<string | null>(null);

  // Use keyboard hook for state management
  const keyboard = useKeyboard({
    layout: keyboardLayout.value,
  });

  // Helper function to send height to parent (accounting for scale)
  const sendHeight = (scale: number, scaledHeight: number) => {
    if (scaledHeight === 0) return;

    // Add 8px bottom padding for drop shadow
    const totalHeight = scaledHeight + 8;

    window.parent.postMessage({
      type: "giellalt-keyboard-resize",
      height: totalHeight,
    }, "*");
  };

  // Use scaling hook for responsive behavior
  const scaling = useKeyboardScaling({
    layout: keyboardLayout.value,
    onScaleChange: sendHeight,
  });

  // Fetch the keyboard layout from the API
  useEffect(() => {
    async function fetchLayout() {
      loading.value = true;
      error.value = null;

      try {
        const response = await fetch(
          buildKeyboardApiUrl({ kbd, layout, platform, variant }),
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch layout (${response.status})`,
          );
        }

        const data = await response.json();
        keyboardLayout.value = data.layout;
      } catch (e) {
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }

    fetchLayout();
  }, [kbd, layout, platform, variant]);

  return (
    <div
      ref={scaling.containerRef}
      class="pb-2"
      style={{
        textAlign: "center",
        overflow: "hidden",
        height: scaling.scaledHeight.value > 0
          ? `${scaling.scaledHeight.value + 8}px`
          : "auto",
      }}
    >
      <div
        ref={scaling.keyboardRef}
        style={{
          transform: `scale(${scaling.scale.value})`,
          transformOrigin: "top left",
          display: "inline-block",
          opacity: scaling.scaledHeight.value > 0 ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
        }}
      >
        <KeyboardDisplay
          layout={keyboardLayout.value}
          loading={loading.value}
          error={error.value}
          onKeyClick={interactive ? keyboard.handleKeyClick : undefined}
          pressedKeyId={keyboard.pressedKeyId.value}
          activeLayer={keyboard.activeLayer.value}
          isShiftActive={keyboard.isShiftActive.value}
          isCapsLockActive={keyboard.isCapsLockActive.value}
          isAltActive={keyboard.isAltActive.value}
          isCmdActive={keyboard.isCmdActive.value}
          isCtrlActive={keyboard.isCtrlActive.value}
          isSymbolsActive={keyboard.isSymbolsActive.value}
          isSymbols2Active={keyboard.isSymbols2Active.value}
          pendingDeadkey={keyboard.pendingDeadkey.value}
          showChrome={false}
        />
      </div>
    </div>
  );
}
