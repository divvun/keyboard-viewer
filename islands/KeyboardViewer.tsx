import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardLayout as KeyboardLayoutComponent } from "../components/KeyboardLayout.tsx";
import { GitHubKeyboardSelector } from "../components/GitHubKeyboardSelector.tsx";

interface KeyboardViewerProps {
  layouts: KeyboardLayout[];
}

export default function KeyboardViewer(
  { layouts: initialLayouts }: KeyboardViewerProps,
) {
  const text = useSignal("");
  const pressedKeyId = useSignal<string | null>(null);
  const isShiftActive = useSignal(false);
  const shiftClickMode = useSignal(false); // true if shift was clicked, false if held
  const isCapsLockActive = useSignal(false);
  const pendingDeadkey = useSignal<string | null>(null); // Holds the deadkey character waiting for combination
  const allLayouts = useSignal<KeyboardLayout[]>(initialLayouts);
  const selectedLayoutId = useSignal(initialLayouts[0]?.id ?? "");

  const clearState = () => {
    text.value = "";
    pendingDeadkey.value = null;
    isShiftActive.value = false;
    shiftClickMode.value = false;
    isCapsLockActive.value = false;
    pressedKeyId.value = null;
  };

  const handleGitHubLayoutLoaded = (layout: KeyboardLayout) => {
    // Check if this layout is already in the list
    const existingIndex = allLayouts.value.findIndex((l) => l.id === layout.id);
    if (existingIndex >= 0) {
      // Replace existing layout
      const updated = [...allLayouts.value];
      updated[existingIndex] = layout;
      allLayouts.value = updated;
    } else {
      // Add new layout
      allLayouts.value = [...allLayouts.value, layout];
    }
    // Select the newly loaded layout
    selectedLayoutId.value = layout.id;
    clearState();
  };

  // Get the currently selected layout
  const layout =
    allLayouts.value.find((l) => l.id === selectedLayoutId.value) ??
      allLayouts.value[0];

  // Guard against undefined layout
  if (!layout) {
    return (
      <div class="text-center text-red-600 p-4">
        No keyboard layout available
      </div>
    );
  }

  // Helper: Check if a key is a Shift key
  const isShiftKey = (key: Key): boolean => {
    return key.id === "ShiftLeft" || key.id === "ShiftRight";
  };

  // Helper: Check if a key is the Caps Lock key
  const isCapsLockKey = (key: Key): boolean => {
    return key.id === "CapsLock";
  };

  // Helper: Get the character to output based on shift and caps lock state
  const getOutputChar = (key: Key): string => {
    // For letter keys, caps lock affects output
    // Use Unicode property escape to match all lowercase letters (including accented and non-Latin)
    const isLetter = key.output.length === 1 && /\p{Ll}/u.test(key.output);

    if (isLetter) {
      // Shift inverts caps lock for letters
      const shouldBeUppercase = isCapsLockActive.value !== isShiftActive.value;
      return shouldBeUppercase ? key.output.toUpperCase() : key.output;
    } else {
      // For non-letters, only shift matters
      return isShiftActive.value && key.shiftOutput
        ? key.shiftOutput
        : key.output;
    }
  };

  // Helper: Exit shift mode if in click mode (one-shot shift)
  const exitShiftClickMode = () => {
    if (shiftClickMode.value) {
      isShiftActive.value = false;
      shiftClickMode.value = false;
    }
  };

  // Get deadkey combinations from the layout
  const deadkeyCombinations = layout.deadkeys ?? {};

  // Helper: Check if a character is a deadkey
  const isDeadkey = (char: string): boolean => {
    return char in deadkeyCombinations;
  };

  // Helper: Get the combination result for deadkey + character
  // Returns the combined character if it exists, otherwise null
  const getDeadkeyCombination = (
    deadkey: string,
    char: string,
  ): string | null => {
    return deadkeyCombinations[deadkey]?.[char] ?? null;
  };

  // Find a key in the layout by its physical key code
  const findKeyByCode = (code: string): Key | undefined => {
    for (const row of layout.rows) {
      const key = row.keys.find((k) => k.id === code);
      if (key) return key;
    }
    return undefined;
  };

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in the textarea
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      e.preventDefault();

      const key = findKeyByCode(e.code);
      if (key) {
        // Handle Shift key specially - activate shift mode but don't call handleKeyClick
        if (isShiftKey(key)) {
          pressedKeyId.value = key.id;
          isShiftActive.value = true;
          shiftClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Caps Lock key specially - toggle on each press
        // Don't set pressedKeyId for toggle keys - we show active state instead
        if (isCapsLockKey(key)) {
          isCapsLockActive.value = !isCapsLockActive.value;
          return;
        }

        pressedKeyId.value = key.id;
        handleKeyClick(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = findKeyByCode(e.code);

      // If releasing Shift and not in click mode, deactivate shift
      if (key && isShiftKey(key) && !shiftClickMode.value) {
        isShiftActive.value = false;
      }

      pressedKeyId.value = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [layout]);

  const handleKeyClick = (key: Key) => {
    // Handle Shift key clicks
    if (isShiftKey(key)) {
      isShiftActive.value = !isShiftActive.value;
      shiftClickMode.value = isShiftActive.value; // Only set clickMode when toggling on
      return;
    }

    // Handle Caps Lock key clicks
    if (isCapsLockKey(key)) {
      isCapsLockActive.value = !isCapsLockActive.value;
      return;
    }

    // Handle special keys
    if (key.id === "Backspace") {
      // If there's a pending deadkey, just cancel it instead of deleting
      if (pendingDeadkey.value !== null) {
        pendingDeadkey.value = null;
      } else {
        text.value = text.value.slice(0, -1);
      }
      exitShiftClickMode();
      return;
    }

    if (key.id === "Enter") {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        text.value += pendingDeadkey.value;
        pendingDeadkey.value = null;
      }
      text.value += "\n";
      exitShiftClickMode();
      return;
    }

    if (key.id === "Tab") {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        text.value += pendingDeadkey.value;
        pendingDeadkey.value = null;
      }
      text.value += "\t";
      exitShiftClickMode();
      return;
    }

    // Ignore modifier keys that don't produce output
    if (!key.output || key.output === "") {
      return;
    }

    // Get the character that would be output
    const charToAdd = getOutputChar(key);

    // Check if we have a pending deadkey
    if (pendingDeadkey.value !== null) {
      const combination = getDeadkeyCombination(
        pendingDeadkey.value,
        charToAdd,
      );
      if (combination !== null) {
        // We have a combination - output the combined character
        text.value += combination;
      } else {
        // No combination exists - output deadkey followed by the character
        text.value += pendingDeadkey.value + charToAdd;
      }
      pendingDeadkey.value = null;
      exitShiftClickMode();
      return;
    }

    // Check if the current character is a deadkey
    if (isDeadkey(charToAdd)) {
      pendingDeadkey.value = charToAdd;
      exitShiftClickMode();
      return;
    }

    // Normal character - just add it
    text.value += charToAdd;

    // Exit shift mode if in click mode (one-shot shift)
    exitShiftClickMode();
  };

  const handleClear = () => {
    text.value = "";
    pendingDeadkey.value = null; // Clear any pending deadkey
  };

  return (
    <div class="flex flex-col gap-6">
      {/* GitHub Keyboard Selector */}
      <GitHubKeyboardSelector onLayoutLoaded={handleGitHubLayoutLoaded} />

      {/* Local/Loaded Layouts Selector */}
      <div class="w-full">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Or select from loaded layouts:
        </label>
        <select
          value={selectedLayoutId.value}
          onChange={(e) => {
            selectedLayoutId.value = (e.target as HTMLSelectElement).value;
            clearState();
          }}
          class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
        >
          {allLayouts.value.map((layoutOption) => (
            <option key={layoutOption.id} value={layoutOption.id}>
              {layoutOption.name}
            </option>
          ))}
        </select>
      </div>

      {/* Output text area */}
      <div class="flex justify-center">
        <div style="width: 50rem; max-width: 100%;">
          <div class="mb-2">
            <label class="block text-sm font-semibold text-gray-700">
              Output
            </label>
          </div>
          <div style="position: relative;">
            <textarea
              value={text.value}
              onInput={(e) => {
                text.value = (e.target as HTMLTextAreaElement).value;
                pendingDeadkey.value = null; // Clear deadkey state when typing directly
              }}
              style="width: 100%;"
              class="h-32 p-3 pr-10 border-2 border-gray-300 rounded font-mono text-sm resize-y focus:outline-none focus:border-blue-500"
              placeholder="Click keys on the keyboard below to type..."
            />
            {text.value && (
              <button
                onClick={handleClear}
                style="position: absolute; top: 0.5rem; right: 0.5rem; z-index: 10; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background-color: #e5e7eb; border-radius: 50%;"
                class="text-gray-600 hover:text-gray-900 hover:bg-gray-300 transition-colors"
                title="Clear"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard */}
      <div class="flex justify-center">
        <KeyboardLayoutComponent
          layout={layout}
          onKeyClick={handleKeyClick}
          pressedKeyId={pressedKeyId.value}
          isShiftActive={isShiftActive.value}
          isCapsLockActive={isCapsLockActive.value}
          pendingDeadkey={pendingDeadkey.value}
        />
      </div>

      {/* Info */}
      <div class="text-center text-sm text-gray-600">
        <p>
          Layout: <strong>{layout.name}</strong>
        </p>
        <p class="text-xs mt-1">
          Click keys to type, or type directly in the text area
        </p>
      </div>
    </div>
  );
}
