import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardLayout as KeyboardLayoutComponent } from "../components/KeyboardLayout.tsx";
import { GitHubKeyboardSelector } from "../components/GitHubKeyboardSelector.tsx";
import { parse as parseYaml } from "jsr:@std/yaml";
import {
  getAvailablePlatforms,
  transformKbdgenToLayout,
  type KbdgenLayout,
} from "../utils/kbdgen-transform.ts";
import { getErrorMessage } from "../utils.ts";

interface KeyboardViewerProps {
  layouts: KeyboardLayout[];
}

type TabMode = "github" | "yaml";

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

  // Tab mode and YAML editor state
  const activeTab = useSignal<TabMode>("github");
  const yamlContent = useSignal("");
  const yamlError = useSignal<string | null>(null);
  const yamlDefaultPlatform = useSignal("macOS");
  const yamlAvailablePlatforms = useSignal<string[]>([]);

  // Track the last GitHub layout YAML
  const lastGitHubYaml = useSignal<string | null>(null);

  const clearState = () => {
    text.value = "";
    pendingDeadkey.value = null;
    isShiftActive.value = false;
    shiftClickMode.value = false;
    isCapsLockActive.value = false;
    pressedKeyId.value = null;
  };

  const handleGitHubLayoutLoaded = (
    layout: KeyboardLayout,
    rawYaml: string,
  ) => {
    // Store the raw YAML for later use
    lastGitHubYaml.value = rawYaml;

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

  const parseAndLoadYaml = () => {
    yamlError.value = null;

    if (!yamlContent.value.trim()) {
      yamlAvailablePlatforms.value = [];
      return;
    }

    try {
      // Parse the YAML
      const kbdgenData = parseYaml(yamlContent.value) as KbdgenLayout;

      // Get available platforms
      const availablePlatforms = getAvailablePlatforms(kbdgenData);
      yamlAvailablePlatforms.value = availablePlatforms;

      if (availablePlatforms.length === 0) {
        yamlError.value = "No supported platforms found in YAML";
        return;
      }

      // Use selected platform or default to macOS if available
      const platform = availablePlatforms.includes(yamlDefaultPlatform.value)
        ? yamlDefaultPlatform.value
        : availablePlatforms[0];

      yamlDefaultPlatform.value = platform;

      // Transform to layout
      const layout = transformKbdgenToLayout(
        kbdgenData,
        platform,
        "custom",
        "yaml-editor",
      );

      // Update or add the layout
      const yamlLayoutId = "yaml-editor-custom";
      layout.id = yamlLayoutId;
      layout.name = kbdgenData.displayNames?.en || "Custom YAML Layout";

      const existingIndex = allLayouts.value.findIndex((l) =>
        l.id === yamlLayoutId
      );
      if (existingIndex >= 0) {
        const updated = [...allLayouts.value];
        updated[existingIndex] = layout;
        allLayouts.value = updated;
      } else {
        allLayouts.value = [...allLayouts.value, layout];
      }

      selectedLayoutId.value = yamlLayoutId;
      clearState();
    } catch (error) {
      yamlError.value = getErrorMessage(error);
      yamlAvailablePlatforms.value = [];
    }
  };

  const handleYamlChange = (newYaml: string) => {
    yamlContent.value = newYaml;
    parseAndLoadYaml();
  };

  const handleYamlPlatformChange = (newPlatform: string) => {
    yamlDefaultPlatform.value = newPlatform;
    parseAndLoadYaml();
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

  // Load stored YAML when switching to YAML tab
  useEffect(() => {
    if (
      activeTab.value === "yaml" && lastGitHubYaml.value && !yamlContent.value
    ) {
      yamlContent.value = lastGitHubYaml.value;
      parseAndLoadYaml();
    }
  }, [activeTab.value]);

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
      {/* Output text area */}
      <div class="flex justify-center">
        <div class="keyboard-width-container">
          <div class="mb-2">
            <label class="block text-sm font-semibold text-gray-700">
              Output
            </label>
          </div>
          <div class="relative">
            <textarea
              value={text.value}
              onInput={(e) => {
                text.value = (e.target as HTMLTextAreaElement).value;
                pendingDeadkey.value = null; // Clear deadkey state when typing directly
              }}
              class="w-full h-32 p-3 pr-10 border-2 border-gray-300 rounded font-mono text-sm resize-y focus:outline-none focus:border-blue-500"
              placeholder="Click keys below or use your keyboard to type..."
            />
            {text.value && (
              <button
                onClick={handleClear}
                class="clear-button text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
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
      </div>

      {/* Tabs */}
      <div class="flex justify-center">
        <div class="keyboard-width-container">
          <div class="flex gap-2 border-b-2 border-gray-300 mb-4">
            <button
              onClick={() => activeTab.value = "github"}
              class={`px-4 py-2 font-semibold text-sm transition-colors ${
                activeTab.value === "github"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Load from GitHub
            </button>
            <button
              onClick={() => activeTab.value = "yaml"}
              class={`px-4 py-2 font-semibold text-sm transition-colors ${
                activeTab.value === "yaml"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              YAML Editor
            </button>
          </div>

          {/* Tab Content */}
          {activeTab.value === "github" && (
            <div>
              <GitHubKeyboardSelector
                onLayoutLoaded={handleGitHubLayoutLoaded}
              />
            </div>
          )}

          {activeTab.value === "yaml" && (
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Paste kbdgen YAML layout:
                </label>
                <textarea
                  value={yamlContent.value}
                  onInput={(e) =>
                    handleYamlChange((e.target as HTMLTextAreaElement).value)}
                  class="w-full h-64 p-3 border-2 border-gray-300 rounded font-mono text-xs resize-y focus:outline-none focus:border-blue-500"
                  placeholder="Paste your kbdgen YAML here..."
                />
              </div>

              {yamlAvailablePlatforms.value.length > 0 && (
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Select Platform:
                  </label>
                  <select
                    value={yamlDefaultPlatform.value}
                    onChange={(e) =>
                      handleYamlPlatformChange(
                        (e.target as HTMLSelectElement).value,
                      )}
                    class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
                  >
                    {yamlAvailablePlatforms.value.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {yamlError.value && (
                <div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  <strong>Error:</strong> {yamlError.value}
                </div>
              )}

              {!yamlError.value && yamlContent.value && (
                <div class="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm">
                  <strong>Success!</strong>{" "}
                  Layout loaded. Start typing on the keyboard above.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Commented out: Local/Loaded Layouts Selector */}
      {
        /* <div class="flex justify-center">
        <div class="keyboard-width-container">
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
      </div> */
      }
    </div>
  );
}
