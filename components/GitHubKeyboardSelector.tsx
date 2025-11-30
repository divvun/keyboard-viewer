import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { getErrorMessage } from "../utils.ts";

interface Repo {
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
  availablePlatforms: string[];
  selectedPlatform: string;
  rawYaml: string;
}

interface GitHubKeyboardSelectorProps {
  onLayoutLoaded: (layout: KeyboardLayout, rawYaml: string) => void;
}

export function GitHubKeyboardSelector(
  { onLayoutLoaded }: GitHubKeyboardSelectorProps,
) {
  const repos = useSignal<Repo[]>([]);
  const layouts = useSignal<LayoutFile[]>([]);
  const platforms = useSignal<string[]>([]);
  const selectedRepo = useSignal<string>("");
  const selectedLayout = useSignal<string>("");
  const selectedPlatform = useSignal<string>("macOS");
  const loading = useSignal<boolean>(false);
  const error = useSignal<string | null>(null);

  // Fetch repos on mount
  useEffect(() => {
    async function fetchRepos() {
      loading.value = true;
      error.value = null;
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
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }
    fetchRepos();
  }, []);

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

  // Fetch layout and platforms when layout or platform changes
  useEffect(() => {
    if (!selectedRepo.value || !selectedLayout.value) return;

    async function fetchLayout() {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(
          `/api/github/layout?repo=${selectedRepo.value}&file=${selectedLayout.value}&platform=${selectedPlatform.value}`,
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

        // Only auto-select a different platform if the current selection is not available
        if (!data.availablePlatforms.includes(selectedPlatform.value)) {
          // Prefer macOS if available, otherwise use first platform
          const newPlatform = data.availablePlatforms.includes("macOS")
            ? "macOS"
            : data.availablePlatforms[0] || "macOS";
          selectedPlatform.value = newPlatform;
          return; // Will trigger another fetch with the new platform
        }

        onLayoutLoaded(data.layout, data.rawYaml);
      } catch (e) {
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }
    fetchLayout();
  }, [selectedRepo.value, selectedLayout.value, selectedPlatform.value]);

  return (
    <div class="w-full space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-gray-800">Load from GitHub</h2>
          {loading.value && (
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

      {error.value && (
        <div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error.value}
        </div>
      )}

      <div class="flex flex-col gap-4">
        {/* Repo selector */}
        <div class="flex items-center gap-4">
          <label class="text-sm font-semibold text-gray-700 w-40 flex-shrink-0 text-right">
            1. Select Language
          </label>
          <select
            value={selectedRepo.value}
            onChange={(e) => {
              selectedRepo.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || repos.value.length === 0}
            class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select a language --</option>
            {repos.value.map((repo) => {
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
        <div class="flex items-center gap-4">
          <label class="text-sm font-semibold text-gray-700 w-40 flex-shrink-0 text-right">
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
        <div class="flex items-center gap-4">
          <label class="text-sm font-semibold text-gray-700 w-40 flex-shrink-0 text-right">
            3. Select Platform
          </label>
          <select
            value={selectedPlatform.value}
            onChange={(e) => {
              selectedPlatform.value = (e.target as HTMLSelectElement).value;
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
      </div>
    </div>
  );
}
