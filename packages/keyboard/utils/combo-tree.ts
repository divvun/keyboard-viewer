import type { DeviceVariant, Platform } from "../constants/platforms.ts";
import type { KeyboardParams } from "./params.ts";
import { fetchKbdgenData } from "./fetch-kbdgen.ts";
import { fetchDisplayName, listLayoutFiles } from "./list-layouts.ts";
import { buildLayoutComboFromKbdgenData } from "./build-layout-combo.ts";
import { HttpError } from "./http-error.ts";
import { NoPlatformsInLayoutError } from "./kbdgen-transform.ts";
import type { LayoutCombo, PlatformCombo } from "../types/combo-tree.ts";

export { NoPlatformsInLayoutError };

/** A kbd's repo has a layouts directory, but it's empty — no `.yaml` layout
 * files at all. Distinct from `LayoutsDirectoryNotFoundError` (the directory
 * itself is missing) and `LayoutNotFoundError` (one specific pinned file is
 * missing). */
export class NoLayoutsFoundError extends HttpError {
  constructor() {
    super("No layouts found for this keyboard", 404);
  }
}

/** The layout file(s) in scope exist, but none of them declare the pinned
 * platform — e.g. a kbd whose only layouts are Android/iOS-only, with
 * `platform=macOS` pinned. */
export class PlatformNotSupportedError extends HttpError {
  constructor(readonly platform: Platform) {
    super(`No layouts available for platform ${platform}`, 404);
  }
}

export interface BuildComboTreeOptions {
  /** Pin to exactly this layout file (its .yaml basename, e.g. "smj-NO"). */
  layoutFile?: string;
  /** Pin to exactly this platform. Combined with `layoutFile`, yields a
   * single-combo tree with one fetch. Alone (layoutFile absent), filters the
   * kbd's layout files down to ones that actually support this platform. */
  platform?: Platform;
  /** Pin to exactly this device variant. Only meaningful combined with
   * `platform` (and usually `layoutFile`) — a bare variant pin is ambiguous
   * without knowing which platform's variant vocabulary it refers to, so
   * this is ignored unless `platform` is also set. If the pinned platform
   * doesn't actually offer this variant, it's ignored (falls back to the
   * usual preferred/first-available resolution) rather than erroring —
   * unlike an invalid `platform` pin, an invalid `variant` pin isn't fatal. */
  variant?: DeviceVariant;
  /** Language codes to try, most preferred first, when picking each layout
   * file's display name out of its kbdgen `displayNames` map — e.g. a site's
   * current UI language plus its own fallback chain. Defaults to English. */
  preferredLangs?: string[];
}

export interface KeyboardComboTree {
  combos: LayoutCombo[];
  /** A layout file present in `combos` — safe to seed UI state with. */
  defaultFile: string;
  /** A platform present in the default file's platformCombos. */
  defaultPlatform: Platform;
  /** A variant present in the default platform's variantCombos. */
  defaultVariant: DeviceVariant;
}

/** First layout file alphabetically (per `listLayoutFiles`'s sort). A repo's
 * "bare" file (e.g. sme's se.yaml) is often mobile-only — preferring it isn't
 * a representative default, so we don't special-case it. */
function pickDefaultLayoutFile(files: { file: string }[]): string {
  return files[0].file;
}

function defaultPlatformFor(
  combo: LayoutCombo,
  preferred: Platform,
): Platform {
  return combo.platformCombos.some((c) => c.platform === preferred)
    ? preferred
    : combo.platformCombos[0].platform;
}

function defaultVariantFor(
  combo: PlatformCombo,
  preferred: DeviceVariant,
): DeviceVariant {
  return combo.variantCombos.some((c) => c.variant === preferred)
    ? preferred
    : combo.variantCombos[0].variant;
}

/**
 * Builds a single layout file's combo: fetches+parses its kbdgen YAML once
 * (cached by `fetchKbdgenData` regardless of how many platforms/variants it
 * produces) and delegates the pure transform to
 * `buildLayoutComboFromKbdgenData`. When `onlyPlatform` is given, filters
 * the result down to just that platform — still enumerating all of *its*
 * variants, unlike the old platform-pinned fast path (which resolved
 * exactly one variant via `loadKeyboardLayout` and could never show a
 * variant tab bar for a pinned platform).
 */
async function buildLayoutCombo(
  kbd: string,
  layoutFile: string,
  displayName: string,
  onlyPlatform?: Platform,
): Promise<LayoutCombo> {
  const { kbdgenData } = await fetchKbdgenData(kbd, layoutFile);
  const combo = buildLayoutComboFromKbdgenData(
    kbdgenData,
    kbd,
    layoutFile,
    displayName,
  );
  if (onlyPlatform == null) return combo;
  return {
    ...combo,
    platformCombos: combo.platformCombos.filter((c) =>
      c.platform === onlyPlatform
    ),
  };
}

/**
 * Builds the full (or partially pinned) layout × platform × variant combo
 * tree for a kbd, the single source of truth for both keyboard-viewer's own
 * `/embed` route and any other consumer (e.g. borealium's resource pages,
 * or a client-side pasted-YAML editor via `buildLayoutComboFromKbdgenData`
 * directly) that wants to render a
 * `StaticKeyboardLayoutPicker`/`KeyboardPicker`. Mirrors the
 * `interactive=false` branch logic that used to live only in
 * `routes/embed.tsx`, generalized into one function with four cases based on
 * which of `layoutFile`/`platform` are pinned.
 */
export async function buildKeyboardComboTree(
  params: KeyboardParams,
  options?: BuildComboTreeOptions,
): Promise<KeyboardComboTree> {
  const { layoutFile, platform, variant, preferredLangs } = options ?? {};

  if (layoutFile != null) {
    const displayName = await fetchDisplayName(
      params.kbd,
      layoutFile,
      preferredLangs,
    );
    const combo = await buildLayoutCombo(
      params.kbd,
      layoutFile,
      displayName,
      platform,
    );
    if (combo.platformCombos.length === 0) {
      throw platform != null
        ? new PlatformNotSupportedError(platform)
        : new NoPlatformsInLayoutError();
    }

    const defaultPlatform = platform ??
      defaultPlatformFor(combo, params.platform);
    const pCombo = combo.platformCombos.find((c) =>
      c.platform === defaultPlatform
    )!;
    const defaultVariant = variant != null && pCombo.variantCombos.some((c) =>
        c.variant === variant
      )
      ? variant
      : defaultVariantFor(pCombo, params.variant);

    return {
      combos: [combo],
      defaultFile: layoutFile,
      defaultPlatform,
      defaultVariant,
    };
  }

  const files = await listLayoutFiles(params.kbd, preferredLangs);
  if (files.length === 0) {
    throw new NoLayoutsFoundError();
  }

  if (platform != null) {
    // Layout absent, platform pinned: some kbdgen repos declare a "bare"
    // layout file for mobile only (e.g. sme's se.yaml is android/iOS-only;
    // the desktop layouts are se-FI/se-NO/se-SE) — only offer files that
    // actually support the pinned platform so every layout tab renders the
    // same platform.
    const built = await Promise.all(
      files.map((f) =>
        buildLayoutCombo(params.kbd, f.file, f.displayName, platform)
      ),
    );
    const combos = built.filter((c) => c.platformCombos.length > 0);

    if (combos.length === 0) {
      throw new PlatformNotSupportedError(platform);
    }

    const defaultFile = pickDefaultLayoutFile(combos);
    const defaultCombo = combos.find((c) => c.file === defaultFile)!;
    const pCombo = defaultCombo.platformCombos[0]; // only one platform present (filtered)

    return {
      combos,
      defaultFile,
      defaultPlatform: platform,
      defaultVariant: defaultVariantFor(pCombo, params.variant),
    };
  }

  // Both absent: full nested layout → platform → variant tree. Each
  // layout's platform set stands on its own — no cross-layout filtering,
  // since switching layout tabs doesn't need to keep a single platform
  // consistent across all of them.
  const combos = await Promise.all(
    files.map((f) => buildLayoutCombo(params.kbd, f.file, f.displayName)),
  );

  const defaultFile = pickDefaultLayoutFile(files);
  const defaultCombo = combos.find((c) => c.file === defaultFile) ?? combos[0];
  const defaultPlatform = defaultPlatformFor(defaultCombo, params.platform);
  const pCombo = defaultCombo.platformCombos.find((c) =>
    c.platform === defaultPlatform
  )!;

  return {
    combos,
    defaultFile: defaultCombo.file,
    defaultPlatform,
    defaultVariant: defaultVariantFor(pCombo, params.variant),
  };
}
