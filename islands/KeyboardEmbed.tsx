import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardDisplay } from "../components/KeyboardDisplay.tsx";
import { useKeyboard } from "../hooks/useKeyboard.ts";
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

  // Fetch the keyboard layout from the API
  useEffect(() => {
    async function fetchLayout() {
      loading.value = true;
      error.value = null;

      try {
        const response = await fetch(
          `/api/github/layout?repo=${kbd}&file=${layout}.yaml&platform=${platform}&variant=${variant}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch layout (${response.status})`
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

  // Send height to parent for auto-sizing
  useEffect(() => {
    if (!keyboardLayout.value) return;

    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'giellalt-keyboard-resize',
        height
      }, '*');
    };

    sendHeight();
    window.addEventListener('resize', sendHeight);

    return () => {
      window.removeEventListener('resize', sendHeight);
    };
  }, [keyboardLayout.value]);

  return (
    <div class="p-2">
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
  );
}
