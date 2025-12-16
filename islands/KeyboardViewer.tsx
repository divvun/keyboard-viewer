import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardDisplay } from "../components/KeyboardDisplay.tsx";
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
import { getLayerDisplayName } from "../utils/modifiers.ts";
import { useKeyboard } from "../hooks/useKeyboard.ts";
import { useKeyboardScaling } from "../hooks/useKeyboardScaling.ts";
import {
  parseKeyboardParams,
  serializeKeyboardParams,
} from "../utils/keyboard-params.ts";

interface KeyboardViewerProps {
  layouts: KeyboardLayout[];
}

type TabMode = "github" | "yaml";

export default function KeyboardViewer(
  { layouts: initialLayouts }: KeyboardViewerProps,
) {
  const text = useSignal("");
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

  // Read URL parameters synchronously for initial keyboard selection
  const getInitialUrlParams = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has("kbd")) {
        return parseKeyboardParams(searchParams);
      }
    }
    return null;
  };

  const initialUrlParams = getInitialUrlParams();

  // Get the currently selected layout
  const layout =
    allLayouts.value.find((l) => l.id === selectedLayoutId.value) ??
      allLayouts.value[0];

  // Use keyboard hook for state management
  const keyboard = useKeyboard({
    layout: layout ?? null,
    onTextOutput: (newText) => {
      text.value += newText;
    },
    onBackspace: () => {
      text.value = text.value.slice(0, -1);
    },
    onClear: () => {
      text.value = "";
    },
  });

  // Use scaling hook for responsive behavior
  const scaling = useKeyboardScaling({
    layout: layout ?? null,
  });

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
    keyboard.clearState();

    // Update URL with layout parameters
    updateURLParams(layout);
  };

  const updateURLParams = (layout: KeyboardLayout) => {
    // Extract parameters from layout ID and metadata
    const parts = layout.id.split("-");
    if (parts.length >= 2) {
      const repo = parts[0];
      const platformIndex = parts.findIndex((p) =>
        ["macOS", "iOS", "android", "windows", "chromeOS"].includes(p)
      );
      let layoutName = platformIndex > 0
        ? parts.slice(1, platformIndex).join("-")
        : parts.slice(1).join("-");

      // Strip .yaml extension if present (to match embed format)
      if (layoutName.endsWith(".yaml")) {
        layoutName = layoutName.slice(0, -5);
      }

      const platform = layout.platform || DEFAULT_PLATFORM;
      const variant = layout.variant || DEFAULT_VARIANT;

      // Update URL without reloading page using shared utility
      const url = new URL(window.location.href);
      url.search = serializeKeyboardParams({
        kbd: repo,
        layout: layoutName,
        platform,
        variant,
      });
      window.history.pushState({}, "", url.toString());
    }
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
      keyboard.clearState();
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

  // Guard against undefined layout
  if (!layout) {
    return (
      <div class="text-center text-red-600 p-4">
        No keyboard layout available
      </div>
    );
  }

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

  const handleClear = () => {
    text.value = "";
    keyboard.pendingDeadkey.value = null; // Clear any pending deadkey
  };

  const getDimensionsForPlatform = (
    platform: string,
    isMobile: boolean,
  ): { width: number; height: number } => {
    if (isMobile) {
      return { width: 400, height: 500 };
    }
    return { width: 800, height: 300 };
  };

  const generateEmbedCode = () => {
    // Extract platform and other info from the current layout
    const currentLayout = layout;
    if (!currentLayout) return "";

    // Try to extract repo and layout name from the layout ID
    // Format is usually: repoCode-layoutName-platform
    const parts = currentLayout.id.split("-");
    let repo = "sme";
    let layoutName = "se";
    let platformName = currentLayout.platform || DEFAULT_PLATFORM;
    let variantName = currentLayout.variant || DEFAULT_VARIANT;

    // Try to parse the ID to get repo and layout
    if (parts.length >= 2) {
      repo = parts[0];
      // Find where platform starts
      const platformIndex = parts.findIndex((p) =>
        ["macOS", "iOS", "android", "windows", "chromeOS"].includes(p)
      );
      if (platformIndex > 0) {
        layoutName = parts.slice(1, platformIndex).join("-");
        platformName = parts[platformIndex];
      } else {
        layoutName = parts.slice(1).join("-");
      }
    }

    const baseUrl = window.location.origin + "/embed";
    const paramsString = serializeKeyboardParams({
      kbd: repo,
      layout: layoutName,
      platform: platformName,
      variant: variantName,
    });

    const dimensions = getDimensionsForPlatform(
      platformName,
      currentLayout.isMobile ?? false,
    );

    return `<iframe src="${baseUrl}?${paramsString}" width="100%" frameborder="0" ></iframe>`;
  };

  const handleCopyEmbedCode = () => {
    const code = generateEmbedCode();
    navigator.clipboard.writeText(code).then(
      () => {
        alert("Embed code copied to clipboard!");
      },
      () => {
        alert("Failed to copy embed code");
      },
    );
  };

  return (
    <div class="flex flex-col gap-4 md:gap-8">
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
              class="w-full h-24 md:h-32 p-2 md:p-3 pr-10 border-2 border-gray-300 rounded font-mono text-sm resize-y focus:outline-none focus:border-blue-500"
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
      <div
        class="flex justify-center"
        ref={scaling.containerRef}
        style={{
          overflow: "visible",
          height: scaling.scaledHeight.value > 0
            ? `${scaling.scaledHeight.value}px`
            : "auto",
        }}
      >
        <div
          ref={scaling.keyboardRef}
          style={{
            transform: `scale(${scaling.scale.value})`,
            transformOrigin: "top center",
            opacity: scaling.scaledHeight.value > 0 ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          <KeyboardDisplay
            layout={layout}
            onKeyClick={keyboard.handleKeyClick}
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
            showChrome={true}
          />
        </div>
      </div>

      {/* Info */}
      <div class="flex justify-center">
        <div class="keyboard-width-container">
          <div class="flex flex-wrap gap-2 md:gap-4 items-center justify-center text-xs md:text-sm text-gray-600">
            <span>
              Layout: <strong>{layout.name}</strong>
            </span>
            <span>
              Active Layer:{" "}
              <strong>{getLayerDisplayName(keyboard.activeLayer.value)}</strong>
            </span>
            <button
              onClick={handleCopyEmbedCode}
              class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-semibold"
              title="Copy embed code for this keyboard"
            >
              📋 Get Embed Code
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex justify-center mt-8">
        <div class="keyboard-width-container">
          <div class="flex gap-2 border-b-2 border-gray-300 mb-4">
            <button
              onClick={() => activeTab.value = "github"}
              class={`px-3 md:px-4 py-2 font-semibold text-xs md:text-sm transition-colors ${
                activeTab.value === "github"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Load from GitHub
            </button>
            <button
              onClick={() => activeTab.value = "yaml"}
              class={`px-3 md:px-4 py-2 font-semibold text-xs md:text-sm transition-colors ${
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
                urlRepo={initialUrlParams?.kbd}
                urlLayout={initialUrlParams?.layout
                  ? `${initialUrlParams.layout}.yaml`
                  : undefined}
                urlPlatform={initialUrlParams?.platform}
                urlVariant={initialUrlParams?.variant}
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
                  class="w-full h-48 md:h-64 p-2 md:p-3 border-2 border-gray-300 rounded font-mono text-xs resize-y focus:outline-none focus:border-blue-500"
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
                <div class="p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
                  <strong>Error:</strong> {yamlError.value}
                </div>
              )}

              {!yamlError.value && yamlContent.value && (
                <div class="p-2 md:p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs md:text-sm">
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
