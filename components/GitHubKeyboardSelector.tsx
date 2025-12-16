import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { getErrorMessage } from "../utils.ts";
import {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  DeviceVariant,
  Platform,
  VariantDisplayNames,
} from "../constants/platforms.ts";
import { buildKeyboardApiUrl } from "../utils/keyboard-params.ts";

export interface Repo {
  code: string;
  name: string;
  description: string;
}

interface LayoutFile {
  name: string;
  displayName: string;
}

interface LayoutResponse {
  layout: KeyboardLayout;
  availablePlatforms: Platform[];
  availableVariants: DeviceVariant[];
  selectedPlatform: Platform;
  selectedVariant: DeviceVariant;
  rawYaml: string;
}

interface GitHubKeyboardSelectorProps {
  repos: Repo[];
  reposLoading: boolean;
  reposError: string | null;
  onLayoutLoaded: (layout: KeyboardLayout, rawYaml: string) => void;
  urlRepo?: string;
  urlLayout?: string;
  urlPlatform?: Platform;
  urlVariant?: DeviceVariant;
}

export function GitHubKeyboardSelector(
  {
    repos: initialRepos,
    reposLoading,
    reposError,
    onLayoutLoaded,
    urlRepo,
    urlLayout,
    urlPlatform,
    urlVariant,
  }: GitHubKeyboardSelectorProps,
) {
  const layouts = useSignal<LayoutFile[]>([]);
  const platforms = useSignal<Platform[]>([]);
  const variants = useSignal<DeviceVariant[]>([]);
  const selectedRepo = useSignal<string>(urlRepo || "");
  const selectedLayout = useSignal<string>(urlLayout || "");
  const selectedPlatform = useSignal<Platform>(
    urlPlatform || DEFAULT_PLATFORM,
  );
  const selectedVariant = useSignal<DeviceVariant>(
    urlVariant || DEFAULT_VARIANT,
  );
  const loading = useSignal<boolean>(false);
  const error = useSignal<string | null>(null);

  // Fetch layouts when repo changes
  useEffect(() => {
    if (!selectedRepo.value) return;

    async function fetchLayouts() {
      loading.value = true;
      error.value = null;
      layouts.value = [];
      selectedLayout.value = "";
      try {
        const response = await fetch(
          `/api/github/layouts?repo=${selectedRepo.value}`,
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch layouts (${response.status})`,
          );
        }
        const data: LayoutFile[] = await response.json();
        layouts.value = data;

        // Auto-select first layout
        if (data.length > 0) {
          selectedLayout.value = data[0].name;
        }
      } catch (e) {
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }
    fetchLayouts();
  }, [selectedRepo.value]);

  // Fetch layout and platforms when layout, platform, or variant changes
  useEffect(() => {
    if (!selectedRepo.value || !selectedLayout.value) return;

    async function fetchLayout() {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(
          buildKeyboardApiUrl({
            kbd: selectedRepo.value,
            layout: selectedLayout.value.replace(/\.yaml$/, ""),
            platform: selectedPlatform.value,
            variant: selectedVariant.value,
          }),
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch layout (${response.status})`,
          );
        }
        const data: LayoutResponse = await response.json();

        platforms.value = data.availablePlatforms;
        variants.value = data.availableVariants;

        // Only auto-select a different platform if the current selection is not available
        if (!data.availablePlatforms.includes(selectedPlatform.value)) {
          // Prefer macOS if available, otherwise use first platform
          const newPlatform = data.availablePlatforms.includes(Platform.MacOS)
            ? Platform.MacOS
            : data.availablePlatforms[0] || Platform.MacOS;
          selectedPlatform.value = newPlatform;
          return; // Will trigger another fetch with the new platform
        }

        // Only auto-select a different variant if the current selection is not available
        if (
          data.availableVariants.length > 0 &&
          !data.availableVariants.includes(selectedVariant.value)
        ) {
          selectedVariant.value = data.availableVariants[0];
          return; // Will trigger another fetch with the new variant
        }

        onLayoutLoaded(data.layout, data.rawYaml);
      } catch (e) {
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }
    fetchLayout();
  }, [
    selectedRepo.value,
    selectedLayout.value,
    selectedPlatform.value,
    selectedVariant.value,
  ]);

  return (
    <div class="w-full space-y-4 p-3 md:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-gray-800">Load from GitHub</h2>
          {(reposLoading || loading.value) && (
            <div
              class="spinner flex-shrink-0"
              style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #4b5563; border-radius: 50%;"
            />
          )}
        </div>
        <p class="text-sm text-gray-600 mt-1">
          Load a keyboard layout directly from a GiellaLT keyboard-xxx repo
        </p>
      </div>

      {(reposError || error.value) && (
        <div class="p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
          Error: {reposError || error.value}
        </div>
      )}

      <div class="flex flex-col gap-2 md:gap-4">
        {/* Repo selector */}
        <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <label class="text-sm font-semibold text-gray-700 text-left md:text-right md:w-40 md:flex-shrink-0">
            1. Select Language
          </label>
          <select
            value={selectedRepo.value}
            onChange={(e) => {
              selectedRepo.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || reposLoading ||
              initialRepos.length === 0}
            class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select a language --</option>
            {initialRepos.map((repo) => {
              const cleanDescription = repo.description
                .split(/\s+/)
                .filter((word) =>
                  !["keyboards", "for", "the", "language", "layout", "keyboard"]
                    .includes(word.toLowerCase())
                )
                .join(" ")
                .trim();
              return (
                <option key={repo.code} value={repo.code}>
                  {repo.code} - {cleanDescription || repo.code}
                </option>
              );
            })}
          </select>
        </div>

        {/* Layout selector */}
        <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <label class="text-sm font-semibold text-gray-700 text-left md:text-right md:w-40 md:flex-shrink-0">
            2. Select Layout
          </label>
          <select
            value={selectedLayout.value}
            onChange={(e) => {
              selectedLayout.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || layouts.value.length === 0}
            class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select a layout --</option>
            {layouts.value.map((layout) => (
              <option key={layout.name} value={layout.name}>
                {layout.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Platform selector */}
        <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <label class="text-sm font-semibold text-gray-700 text-left md:text-right md:w-40 md:flex-shrink-0">
            3. Select Platform
          </label>
          <select
            value={selectedPlatform.value}
            onChange={(e) => {
              selectedPlatform.value = (e.target as HTMLSelectElement)
                .value as Platform;
              // Reset variant to primary when platform changes
              selectedVariant.value = DEFAULT_VARIANT;
            }}
            disabled={loading.value || platforms.value.length === 0}
            class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            {platforms.value.length === 0
              ? <option value="">-- Select platform --</option>
              : (
                platforms.value.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))
              )}
          </select>
        </div>

        {/* Variant selector (mobile only) */}
        {variants.value.length > 0 && (
          <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
            <label class="text-sm font-semibold text-gray-700 text-left md:text-right md:w-40 md:flex-shrink-0">
              4. Select Device Type
            </label>
            <select
              value={selectedVariant.value}
              onChange={(e) => {
                selectedVariant.value = (e.target as HTMLSelectElement)
                  .value as DeviceVariant;
              }}
              disabled={loading.value}
              class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
            >
              {variants.value.map((variant) => {
                const displayName = VariantDisplayNames[variant] || variant;

                return (
                  <option key={variant} value={variant}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
