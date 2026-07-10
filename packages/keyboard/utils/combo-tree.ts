import type { Platform } from "../constants/platforms.ts";
import type { KeyboardParams } from "./params.ts";
import { enumerateLayers } from "./layer-state.ts";
import { listLayoutFiles } from "./list-layouts.ts";
import { loadKeyboardLayout } from "./load-layout.ts";
import type { LayoutCombo } from "../components/StaticKeyboardLayoutPicker.tsx";
import type { PlatformCombo } from "../components/StaticKeyboardPlatformPicker.tsx";

export interface BuildComboTreeOptions {
  /** Pin to exactly this layout file (its .yaml basename, e.g. "smj-NO"). */
  layoutFile?: string;
  /** Pin to exactly this platform. Combined with `layoutFile`, yields a
   * single-combo tree with one fetch. Alone (layoutFile absent), filters the
   * kbd's layout files down to ones that actually support this platform. */
  platform?: Platform;
}

export interface KeyboardComboTree {
  combos: LayoutCombo[];
  /** A layout file present in `combos` — safe to seed UI state with. */
  defaultFile: string;
  /** A platform present in the default file's platformCombos. */
  defaultPlatform: Platform;
}

/** First layout file alphabetically (per `listLayoutFiles`'s sort). A repo's
 * "bare" file (e.g. sme's se.yaml) is often mobile-only — preferring it isn't
 * a representative default, so we don't special-case it. */
function pickDefaultLayoutFile(files: { file: string }[]): string {
  return files[0].file;
}

/**
 * Loads platform combos for a single layout file. When `onlyPlatform` is
 * given, loads just that one platform (a single fetch, no probe) — otherwise
 * enumerates every platform the file declares. `loadKeyboardLayout` caches
 * the underlying kbdgen fetch+parse per (kbd, layoutFile) — see
 * `fetch-kbdgen.ts` — so materializing multiple platforms from one file only
 * costs one GitHub fetch regardless of how many platforms it produces.
 */
async function buildPlatformCombosForLayout(
  params: KeyboardParams,
  layoutFile: string,
  onlyPlatform?: Platform,
): Promise<PlatformCombo[]> {
  if (onlyPlatform != null) {
    const loaded = await loadKeyboardLayout({
      ...params,
      layout: layoutFile,
      platform: onlyPlatform,
    });
    return [{
      platform: onlyPlatform,
      layout: loaded.layout,
      layers: enumerateLayers(loaded.layout),
    }];
  }

  const probe = await loadKeyboardLayout({ ...params, layout: layoutFile });
  return Promise.all(
    probe.availablePlatforms.map(async (platform) => {
      const loaded = platform === probe.selectedPlatform
        ? probe
        : await loadKeyboardLayout({ ...params, layout: layoutFile, platform });
      return {
        platform,
        layout: loaded.layout,
        layers: enumerateLayers(loaded.layout),
      };
    }),
  );
}

function defaultPlatformFor(
  combo: LayoutCombo,
  preferred: Platform,
): Platform {
  return combo.platformCombos.some((c) => c.platform === preferred)
    ? preferred
    : combo.platformCombos[0].platform;
}

/**
 * Builds the full (or partially pinned) layout × platform combo tree for a
 * kbd, the single source of truth for both keyboard-viewer's own `/embed`
 * route and any other consumer (e.g. borealium's resource pages) that wants
 * to render a `StaticKeyboardLayoutPicker`/`KeyboardPicker`. Mirrors the
 * `interactive=false` branch logic that used to live only in
 * `routes/embed.tsx`, generalized into one function with four cases based on
 * which of `layoutFile`/`platform` are pinned.
 */
export async function buildKeyboardComboTree(
  params: KeyboardParams,
  options?: BuildComboTreeOptions,
): Promise<KeyboardComboTree> {
  const { layoutFile, platform } = options ?? {};

  if (layoutFile != null) {
    const platformCombos = await buildPlatformCombosForLayout(
      params,
      layoutFile,
      platform,
    );
    const combo: LayoutCombo = {
      file: layoutFile,
      displayName: layoutFile,
      platformCombos,
    };
    return {
      combos: [combo],
      defaultFile: layoutFile,
      defaultPlatform: platform ?? defaultPlatformFor(combo, params.platform),
    };
  }

  const files = await listLayoutFiles(params.kbd);
  if (files.length === 0) {
    throw new Error("No layouts found for this keyboard");
  }

  if (platform != null) {
    // Layout absent, platform pinned: some kbdgen repos declare a "bare"
    // layout file for mobile only (e.g. sme's se.yaml is android/iOS-only;
    // the desktop layouts are se-FI/se-NO/se-SE) — only offer files that
    // actually support the pinned platform so every layout tab renders the
    // same platform.
    const loaded = await Promise.all(
      files.map(async (f) => ({
        file: f.file,
        displayName: f.displayName,
        loaded: await loadKeyboardLayout({ ...params, layout: f.file }),
      })),
    );

    const combos: LayoutCombo[] = loaded
      .filter((c) => c.loaded.selectedPlatform === platform)
      .map((c) => ({
        file: c.file,
        displayName: c.displayName,
        platformCombos: [{
          platform: c.loaded.selectedPlatform,
          layout: c.loaded.layout,
          layers: enumerateLayers(c.loaded.layout),
        }],
      }));

    if (combos.length === 0) {
      throw new Error(`No layouts available for platform ${platform}`);
    }

    return {
      combos,
      defaultFile: pickDefaultLayoutFile(combos),
      defaultPlatform: platform,
    };
  }

  // Both absent: full nested layout → platform tree. Each layout's platform
  // set stands on its own — no cross-layout filtering, since switching
  // layout tabs doesn't need to keep a single platform consistent across all
  // of them.
  const combos: LayoutCombo[] = await Promise.all(
    files.map(async (f) => ({
      file: f.file,
      displayName: f.displayName,
      platformCombos: await buildPlatformCombosForLayout(params, f.file),
    })),
  );

  const defaultFile = pickDefaultLayoutFile(files);
  const defaultCombo = combos.find((c) => c.file === defaultFile) ??
    combos[0];

  return {
    combos,
    defaultFile: defaultCombo.file,
    defaultPlatform: defaultPlatformFor(defaultCombo, params.platform),
  };
}
