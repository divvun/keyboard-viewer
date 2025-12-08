import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardLayout as KeyboardLayoutComponent } from "../components/KeyboardLayout.tsx";
import {
  GitHubKeyboardSelector,
  type Repo,
} from "../components/GitHubKeyboardSelector.tsx";
import { parse as parseYaml } from "jsr:@std/yaml";
import {
  getAvailablePlatforms,
  getMobileVariants,
  type KbdgenLayout,
  transformKbdgenToLayout,
} from "../utils/kbdgen-transform.ts";
import {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  DeviceVariant,
  Platform,
  VariantDisplayNames,
} from "../constants/platforms.ts";
import { getErrorMessage } from "../utils.ts";
import {
  getActiveLayer,
  getLayerDisplayName,
  type ModifierState,
} from "../utils/modifiers.ts";
import {
  getKeyOutput,
  isAltKey,
  isCapsLockKey,
  isCmdKey,
  isCtrlKey,
  isShiftKey,
  isSymbolsKey,
} from "../utils/key-helpers.ts";
import {
  BACKSPACE_KEY,
  ENTER_KEY,
  TAB_KEY,
} from "../constants/key-ids.ts";

interface KeyboardViewerProps {
  layouts: KeyboardLayout[];
}

type TabMode = "github" | "yaml";

export default function KeyboardViewer(
  { layouts: initialLayouts }: KeyboardViewerProps,
) {
  const text = useSignal("");
  const pressedKeyId = useSignal<string | null>(null);

  // Modifier states
  const isShiftActive = useSignal(false);
  const shiftClickMode = useSignal(false); // true if shift was clicked, false if held
  const isCapsLockActive = useSignal(false);
  const isAltActive = useSignal(false);
  const altClickMode = useSignal(false);
  const isCmdActive = useSignal(false);
  const cmdClickMode = useSignal(false);
  const isCtrlActive = useSignal(false);
  const ctrlClickMode = useSignal(false);
  const isSymbolsActive = useSignal(false); // Mobile symbols mode
  const isSymbols2Active = useSignal(false); // Mobile symbols-2 layer toggle

  const pendingDeadkey = useSignal<string | null>(null); // Holds the deadkey character waiting for combination
  const allLayouts = useSignal<KeyboardLayout[]>(initialLayouts);
  const selectedLayoutId = useSignal(initialLayouts[0]?.id ?? "");

  // Tab mode and YAML editor state
  const activeTab = useSignal<TabMode>("github");
  const yamlContent = useSignal("");
  const yamlError = useSignal<string | null>(null);
  const yamlDefaultPlatform = useSignal<Platform>(DEFAULT_PLATFORM);
  const yamlAvailablePlatforms = useSignal<Platform[]>([]);
  const yamlDefaultVariant = useSignal<DeviceVariant>(DEFAULT_VARIANT);
  const yamlAvailableVariants = useSignal<DeviceVariant[]>([]);

  // Track the last GitHub layout YAML
  const lastGitHubYaml = useSignal<string | null>(null);

  // GitHub repos cache
  const repos = useSignal<Repo[]>([]);
  const reposLoading = useSignal<boolean>(false);
  const reposError = useSignal<string | null>(null);

  // Compute the active layer based on modifier state
  const activeLayer = useComputed(() => {
    // For mobile symbols mode, use symbols-1 or symbols-2
    if (isSymbolsActive.value) {
      return isSymbols2Active.value ? "symbols-2" : "symbols-1";
    }

    // Desktop/normal layers
    const modifiers: ModifierState = {
      shift: isShiftActive.value,
      caps: isCapsLockActive.value,
      alt: isAltActive.value,
      cmd: isCmdActive.value,
      ctrl: isCtrlActive.value,
    };
    return getActiveLayer(modifiers);
  });

  const clearState = () => {
    text.value = "";
    pendingDeadkey.value = null;
    isShiftActive.value = false;
    shiftClickMode.value = false;
    isCapsLockActive.value = false;
    isAltActive.value = false;
    altClickMode.value = false;
    isCmdActive.value = false;
    cmdClickMode.value = false;
    isCtrlActive.value = false;
    ctrlClickMode.value = false;
    isSymbolsActive.value = false;
    isSymbols2Active.value = false;
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
      yamlAvailableVariants.value = [];
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

      // Get available variants for this platform
      const availableVariants = getMobileVariants(kbdgenData, platform);
      yamlAvailableVariants.value = availableVariants;

      // Determine the variant to use
      let variant: DeviceVariant = DEFAULT_VARIANT;
      if (availableVariants.length > 0) {
        // Use selected variant if available, otherwise use first variant
        variant = availableVariants.includes(yamlDefaultVariant.value)
          ? yamlDefaultVariant.value
          : availableVariants[0];
        yamlDefaultVariant.value = variant;
      }

      // Transform to layout
      const layout = transformKbdgenToLayout(
        kbdgenData,
        platform,
        "custom",
        "yaml-editor",
        variant,
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
      yamlAvailableVariants.value = [];
    }
  };

  const handleYamlChange = (newYaml: string) => {
    yamlContent.value = newYaml;
    parseAndLoadYaml();
  };

  const handleYamlPlatformChange = (newPlatform: Platform) => {
    yamlDefaultPlatform.value = newPlatform;
    // Reset variant to primary when platform changes
    yamlDefaultVariant.value = DEFAULT_VARIANT;
    parseAndLoadYaml();
  };

  const handleYamlVariantChange = (newVariant: DeviceVariant) => {
    yamlDefaultVariant.value = newVariant;
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

  // Helper: Exit click mode for all modifiers (one-shot modifiers)
  const exitClickModes = () => {
    if (shiftClickMode.value) {
      isShiftActive.value = false;
      shiftClickMode.value = false;
    }
    if (altClickMode.value) {
      isAltActive.value = false;
      altClickMode.value = false;
    }
    if (cmdClickMode.value) {
      isCmdActive.value = false;
      cmdClickMode.value = false;
    }
    if (ctrlClickMode.value) {
      isCtrlActive.value = false;
      ctrlClickMode.value = false;
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

  // Fetch repos on mount (cached for tab switching)
  useEffect(() => {
    async function fetchRepos() {
      reposLoading.value = true;
      reposError.value = null;
      try {
        const response = await fetch("/api/github/repos");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch repos (${response.status})`,
          );
        }
        const data = await response.json();
        repos.value = data;
      } catch (e) {
        reposError.value = getErrorMessage(e);
      } finally {
        reposLoading.value = false;
      }
    }
    fetchRepos();
  }, []);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an editable textarea (not readonly)
      if (e.target instanceof HTMLTextAreaElement && !e.target.readOnly) {
        return;
      }

      e.preventDefault();

      const key = findKeyByCode(e.code);
      if (key) {
        // Handle Shift key specially - activate shift mode but don't call handleKeyClick
        if (isShiftKey(key.id)) {
          pressedKeyId.value = key.id;
          isShiftActive.value = true;
          shiftClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Caps Lock key specially - toggle on each press
        // Don't set pressedKeyId for toggle keys - we show active state instead
        if (isCapsLockKey(key.id)) {
          isCapsLockActive.value = !isCapsLockActive.value;
          return;
        }

        // Handle Alt key - activate alt mode but don't call handleKeyClick
        if (isAltKey(key.id)) {
          pressedKeyId.value = key.id;
          isAltActive.value = true;
          altClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Cmd key - activate cmd mode but don't call handleKeyClick
        if (isCmdKey(key.id)) {
          pressedKeyId.value = key.id;
          isCmdActive.value = true;
          cmdClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Ctrl key - activate ctrl mode but don't call handleKeyClick
        if (isCtrlKey(key.id)) {
          pressedKeyId.value = key.id;
          isCtrlActive.value = true;
          ctrlClickMode.value = false; // Physical hold, not click
          return;
        }

        pressedKeyId.value = key.id;
        handleKeyClick(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an editable textarea (not readonly)
      if (e.target instanceof HTMLTextAreaElement && !e.target.readOnly) {
        return;
      }

      const key = findKeyByCode(e.code);

      if (key) {
        // Release modifiers when physical key is released (if not in click mode)
        if (isShiftKey(key.id) && !shiftClickMode.value) {
          isShiftActive.value = false;
        }
        if (isAltKey(key.id) && !altClickMode.value) {
          isAltActive.value = false;
        }
        if (isCmdKey(key.id) && !cmdClickMode.value) {
          isCmdActive.value = false;
        }
        if (isCtrlKey(key.id) && !ctrlClickMode.value) {
          isCtrlActive.value = false;
        }
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
    if (isShiftKey(key.id)) {
      // In symbols mode, shift toggles between symbols-1 and symbols-2
      if (isSymbolsActive.value) {
        isSymbols2Active.value = !isSymbols2Active.value;
        return;
      }
      // Otherwise, normal shift behavior
      isShiftActive.value = !isShiftActive.value;
      shiftClickMode.value = isShiftActive.value;
      return;
    }

    // Handle Caps Lock key clicks
    if (isCapsLockKey(key.id)) {
      isCapsLockActive.value = !isCapsLockActive.value;
      return;
    }

    // Handle Alt key clicks
    if (isAltKey(key.id)) {
      isAltActive.value = !isAltActive.value;
      altClickMode.value = isAltActive.value;
      return;
    }

    // Handle Cmd key clicks
    if (isCmdKey(key.id)) {
      isCmdActive.value = !isCmdActive.value;
      cmdClickMode.value = isCmdActive.value;
      return;
    }

    // Handle Ctrl key clicks
    if (isCtrlKey(key.id)) {
      isCtrlActive.value = !isCtrlActive.value;
      ctrlClickMode.value = isCtrlActive.value;
      return;
    }

    // Handle mobile symbols key clicks
    if (isSymbolsKey(key.id)) {
      isSymbolsActive.value = !isSymbolsActive.value;
      // Reset symbols-2 when leaving symbols mode
      if (!isSymbolsActive.value) {
        isSymbols2Active.value = false;
      }
      return;
    }

    // Handle special keys
    if (key.id === BACKSPACE_KEY) {
      // If there's a pending deadkey, just cancel it instead of deleting
      if (pendingDeadkey.value !== null) {
        pendingDeadkey.value = null;
      } else {
        text.value = text.value.slice(0, -1);
      }
      exitClickModes();
      return;
    }

    if (key.id === ENTER_KEY) {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        text.value += pendingDeadkey.value;
        pendingDeadkey.value = null;
      }
      text.value += "\n";
      exitClickModes();
      return;
    }

    if (key.id === TAB_KEY) {
      // If there's a pending deadkey, output it first
      if (pendingDeadkey.value !== null) {
        text.value += pendingDeadkey.value;
        pendingDeadkey.value = null;
      }
      text.value += "\t";
      exitClickModes();
      return;
    }

    // Get the output for this key
    const output = getKeyOutput(key, activeLayer.value);

    // Ignore keys with no output
    if (!output || output === "") {
      return;
    }

    // Get the character that would be output
    const charToAdd = output;

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
      exitClickModes();
      return;
    }

    // Check if the current character is a deadkey
    if (isDeadkey(charToAdd)) {
      pendingDeadkey.value = charToAdd;
      exitClickModes();
      return;
    }

    // Normal character - just add it
    text.value += charToAdd;

    // Exit click modes (one-shot modifiers)
    exitClickModes();
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
              readOnly
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
          activeLayer={activeLayer.value}
          isShiftActive={isShiftActive.value}
          isCapsLockActive={isCapsLockActive.value}
          isAltActive={isAltActive.value}
          isCmdActive={isCmdActive.value}
          isCtrlActive={isCtrlActive.value}
          isSymbolsActive={isSymbolsActive.value}
          isSymbols2Active={isSymbols2Active.value}
          pendingDeadkey={pendingDeadkey.value}
        />
      </div>

      {/* Info */}
      <div class="flex justify-center">
        <div class="keyboard-width-container">
          <div class="flex flex-wrap gap-4 items-center justify-center text-sm text-gray-600">
            <span>
              Layout: <strong>{layout.name}</strong>
            </span>
            <span>
              Active Layer:{" "}
              <strong>{getLayerDisplayName(activeLayer.value)}</strong>
            </span>
          </div>
        </div>
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
                repos={repos.value}
                reposLoading={reposLoading.value}
                reposError={reposError.value}
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
                        (e.target as HTMLSelectElement).value as Platform,
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

              {/* Variant selector (mobile only) */}
              {yamlAvailableVariants.value.length > 0 && (
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Select Device Type:
                  </label>
                  <select
                    value={yamlDefaultVariant.value}
                    onChange={(e) =>
                      handleYamlVariantChange(
                        (e.target as HTMLSelectElement).value as DeviceVariant,
                      )}
                    class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
                  >
                    {yamlAvailableVariants.value.map((variant) => {
                      const displayName = VariantDisplayNames[variant] ||
                        variant;

                      return (
                        <option key={variant} value={variant}>
                          {displayName}
                        </option>
                      );
                    })}
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
