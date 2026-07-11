import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { parse as parseYaml } from "jsr:@std/yaml@^1.0.0";
import {
  buildLayoutComboFromKbdgenData,
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  type DeviceVariant,
  enumerateLayers,
  type KbdgenLayout,
  type KeyboardLayout,
  KeyboardPicker,
  type KeyboardSelection,
  type LayoutCombo,
  type Platform,
} from "@divvun/keyboard";
import {
  GitHubKeyboardSelector,
  type Repo,
} from "../components/GitHubKeyboardSelector.tsx";
import { getErrorMessage } from "../utils.ts";
import { serializeKeyboardParams } from "../utils/keyboard-params.ts";

interface KeyboardViewerProps {
  defaultLayout: KeyboardLayout;
}

type TabMode = "github" | "yaml";

/** Everything `<KeyboardPicker>` needs to render one keyboard, plus a `key`
 * that changes whenever the underlying source changes (a different repo, a
 * new YAML paste) — `KeyboardPicker`'s checkedFile/checkedPlatform/etc.
 * state is seeded once via lazy useState initializers, so swapping its
 * `combos` prop alone would NOT reset that state; a `key` change forces a
 * full remount instead. */
interface Source {
  key: string;
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialPlatform: Platform;
  initialVariant: DeviceVariant;
}

function wrapSingleLayout(kbd: string, layout: KeyboardLayout): Source {
  const platform = layout.platform ?? DEFAULT_PLATFORM;
  const variant = layout.variant ?? DEFAULT_VARIANT;
  return {
    key: `single:${layout.id}`,
    kbd,
    combos: [{
      file: layout.id,
      displayName: layout.name,
      platformCombos: [{
        platform,
        variantCombos: [{ variant, layout, layers: enumerateLayers(layout) }],
      }],
    }],
    initialFile: layout.id,
    initialPlatform: platform,
    initialVariant: variant,
  };
}

export default function KeyboardViewer({ defaultLayout }: KeyboardViewerProps) {
  const activeTab = useSignal<TabMode>("github");

  const repos = useSignal<Repo[]>([]);
  const reposLoading = useSignal<boolean>(false);
  const reposError = useSignal<string | null>(null);
  const selectedRepo = useSignal<string>("");
  const repoLoadError = useSignal<string | null>(null);
  const repoLoading = useSignal<boolean>(false);

  const yamlContent = useSignal("");
  const yamlError = useSignal<string | null>(null);

  const source = useSignal<Source>(wrapSingleLayout("qwerty", defaultLayout));
  const selection = useSignal<KeyboardSelection | null>(null);
  const rawYaml = useSignal<string | null>(null);
  const rawYamlLoading = useSignal<boolean>(false);

  useEffect(() => {
    reposLoading.value = true;
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) repos.value = data;
        else reposError.value = data.error ?? "Failed to load repos";
      })
      .catch((e) => reposError.value = getErrorMessage(e))
      .finally(() => reposLoading.value = false);
  }, []);

  const handleRepoSelected = async (repo: string) => {
    selectedRepo.value = repo;
    repoLoadError.value = null;
    rawYaml.value = null;
    if (!repo) return;

    repoLoading.value = true;
    try {
      const res = await fetch(
        `/api/github/keyboard?repo=${encodeURIComponent(repo)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to load ${repo}`);
      source.value = {
        key: `github:${repo}`,
        kbd: repo,
        combos: data.combos,
        initialFile: data.defaultFile,
        initialPlatform: data.defaultPlatform,
        initialVariant: data.defaultVariant,
      };
    } catch (e) {
      repoLoadError.value = getErrorMessage(e);
    } finally {
      repoLoading.value = false;
    }
  };

  const handleYamlChange = (text: string) => {
    yamlContent.value = text;
    yamlError.value = null;
    if (!text.trim()) return;

    try {
      const kbdgenData = parseYaml(text) as KbdgenLayout;
      const combo = buildLayoutComboFromKbdgenData(
        kbdgenData,
        "custom",
        "custom",
        kbdgenData.displayNames?.en || "Custom YAML Layout",
      );
      if (combo.platformCombos.length === 0) {
        throw new Error("No supported platforms found in YAML");
      }
      source.value = {
        key: `yaml:${text.length}:${text.slice(0, 40)}`,
        kbd: "custom",
        combos: [combo],
        initialFile: combo.file,
        initialPlatform: combo.platformCombos[0].platform,
        initialVariant: combo.platformCombos[0].variantCombos[0].variant,
      };
    } catch (e) {
      yamlError.value = getErrorMessage(e);
    }
  };

  const handleViewYaml = async () => {
    if (!selectedRepo.value || !selection.value) return;
    rawYamlLoading.value = true;
    try {
      const res = await fetch(
        `/api/github/raw-yaml?repo=${
          encodeURIComponent(selectedRepo.value)
        }&file=${encodeURIComponent(selection.value.file)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load YAML");
      rawYaml.value = data.rawYaml;
    } catch (e) {
      rawYaml.value = `Error: ${getErrorMessage(e)}`;
    } finally {
      rawYamlLoading.value = false;
    }
  };

  const handleCopyEmbedCode = () => {
    if (!selectedRepo.value || !selection.value) return;
    const query = serializeKeyboardParams({
      kbd: selectedRepo.value,
      layout: selection.value.file,
      platform: selection.value.platform,
      variant: selection.value.variant,
    });
    const url = `${globalThis.location.origin}/embed?${query}`;
    const code =
      `<iframe src="${url}" width="100%" height="500" style="border:none;"></iframe>`;
    navigator.clipboard.writeText(code).then(
      () => alert("Embed code copied to clipboard!"),
      () => alert("Failed to copy embed code"),
    );
  };

  const canEmbed = activeTab.value === "github" && !!selectedRepo.value &&
    !!selection.value;

  return (
    <div class="flex flex-col gap-4 md:gap-8">
      <div class="flex justify-center">
        <div class="keyboard-width-container">
          <KeyboardPicker
            key={source.value.key}
            kbd={source.value.kbd}
            combos={source.value.combos}
            initialFile={source.value.initialFile}
            initialPlatform={source.value.initialPlatform}
            initialVariant={source.value.initialVariant}
            onSelectionChange={(sel) => selection.value = sel}
          />
        </div>
      </div>

      {canEmbed && (
        <div class="flex justify-center">
          <div class="keyboard-width-container flex flex-wrap gap-2 md:gap-4 items-center justify-center text-xs md:text-sm text-gray-600">
            <button
              type="button"
              onClick={handleCopyEmbedCode}
              class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-xs font-semibold"
              title="Copy embed code for this keyboard"
            >
              📋 Get Embed Code
            </button>
            <button
              type="button"
              onClick={handleViewYaml}
              class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs font-semibold"
            >
              {rawYamlLoading.value ? "Loading…" : "View YAML"}
            </button>
          </div>
        </div>
      )}

      {rawYaml.value && (
        <div class="flex justify-center">
          <div class="keyboard-width-container">
            <pre class="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto max-h-96">{rawYaml.value}</pre>
          </div>
        </div>
      )}

      <div class="flex justify-center mt-8">
        <div class="keyboard-width-container">
          <div class="flex gap-2 border-b-2 border-gray-300 mb-4">
            <button
              type="button"
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
              type="button"
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

          {activeTab.value === "github" && (
            <div>
              <GitHubKeyboardSelector
                repos={repos.value}
                reposLoading={reposLoading.value || repoLoading.value}
                reposError={reposError.value}
                selectedRepo={selectedRepo.value}
                onRepoSelected={handleRepoSelected}
              />
              {repoLoadError.value && (
                <div class="mt-2 p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
                  Error: {repoLoadError.value}
                </div>
              )}
            </div>
          )}

          {activeTab.value === "yaml" && (
            <div class="space-y-2">
              <p class="text-sm text-gray-600">
                Paste a kbdgen layout YAML to test it directly, without pushing
                it to a repo first.
              </p>
              <textarea
                value={yamlContent.value}
                onInput={(e) =>
                  handleYamlChange((e.target as HTMLTextAreaElement).value)}
                rows={12}
                placeholder="displayNames:&#10;  en: My Layout&#10;macOS:&#10;  primary:&#10;    layers:&#10;      default: |&#10;        ..."
                class="w-full p-2 border-2 border-gray-300 rounded font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              {yamlError.value && (
                <div class="p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
                  Error: {yamlError.value}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
