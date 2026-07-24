import type { DeviceVariant, Platform } from "../constants/platforms.ts";
import { slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import type { KeyboardEmbedHydration } from "./StaticKeyboardEmbed.tsx";
import type { PlatformCombo } from "../types/combo-tree.ts";
import {
  computeVariantPickerHeightPx,
  StaticKeyboardVariantPicker,
} from "./StaticKeyboardVariantPicker.tsx";

export type { PlatformCombo };

interface StaticKeyboardPlatformPickerProps {
  /** Unique per (kbd, layout) — keeps radio names from colliding when this
   * picker is nested once per layout inside StaticKeyboardLayoutPicker. */
  uidPrefix: string;
  combos: PlatformCombo[];
  initialPlatform: Platform;
  initialVariant: DeviceVariant;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
  /** Hydration hooks: which platform is checked (overrides the initialPlatform
   * fallback below) and a callback fired when the user switches platform tabs.
   * Both optional — absent in pure-static SSR usage (the /embed route's
   * non-interactive path), used by the hydrated KeyboardPicker component. */
  checkedPlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
  /** Forwarded straight into the nested StaticKeyboardVariantPicker. */
  checkedVariant?: DeviceVariant;
  onVariantChange?: (variant: DeviceVariant) => void;
  /** Forwarded through both nested levels into StaticKeyboardEmbed. */
  embedHydration?: KeyboardEmbedHydration;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  macOS: "macOS",
  windows: "Windows",
  chromeOS: "Chrome OS",
  android: "Android",
  iOS: "iOS",
} as Record<Platform, string>;

/**
 * Total rendered height (px) of a `StaticKeyboardPlatformPicker` for the
 * platform that would actually be checked at SSR time — mirrors the
 * `checkedPlatform` fallback logic in the component below exactly, so the
 * height this reports always matches what gets rendered.
 */
export function computePlatformPickerHeightPx(
  combos: PlatformCombo[],
  initialPlatform: Platform,
  initialVariant: DeviceVariant,
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computeVariantPickerHeightPx(
      combos[0].variantCombos,
      initialVariant,
      requestedWidth,
    );
  }
  const checked = combos.find((c) => c.platform === initialPlatform) ??
    combos[0];
  return TAB_BAR_HEIGHT_PX +
    computeVariantPickerHeightPx(
      checked.variantCombos,
      initialVariant,
      requestedWidth,
    );
}

/**
 * Renders a single keyboard when only one platform is in scope for this
 * layout (the common case). When a layout file declares more than one
 * platform (e.g. mhr declares all five), renders an outer platform tab bar
 * above the keyboard, toggled the same pure-CSS radio way as the layer and
 * layout tabs. The tab bar itself is unscaled UI chrome — only the nested
 * keyboards (via `StaticKeyboardVariantPicker`/`StaticKeyboardEmbed`) scale
 * to `requestedWidth`.
 */
export function StaticKeyboardPlatformPicker({
  uidPrefix,
  combos,
  initialPlatform,
  initialVariant,
  initialLayer,
  requestedWidth,
  checkedPlatform: checkedPlatformProp,
  onPlatformChange,
  checkedVariant,
  onVariantChange,
  embedHydration,
}: StaticKeyboardPlatformPickerProps) {
  const checkedPlatform = checkedPlatformProp ??
    (combos.some((c) => c.platform === initialPlatform)
      ? initialPlatform
      : combos[0].platform);

  return (
    <CssTabPicker
      dimension="platform"
      uid={slugifyId(uidPrefix)}
      caption="Platform:"
      checkedId={slugifyId(checkedPlatform)}
      onCheck={onPlatformChange &&
        ((item) => onPlatformChange(item.value.platform))}
      items={combos.map((c) => ({
        id: slugifyId(c.platform),
        label: PLATFORM_LABELS[c.platform] ?? c.platform,
        ariaLabel: `Platform: ${PLATFORM_LABELS[c.platform]}`,
        data: { "data-platform": c.platform },
        value: c,
      }))}
      renderView={({ value: c }) => {
        // Only the checked platform is ever visible — scope the live
        // variant/typing wiring to it so switching tabs/typing doesn't
        // re-render every other platform's whole variant x layer subtree on
        // every keystroke. See the equivalent guard in
        // StaticKeyboardLayoutPicker for the layout dimension.
        const isActivePlatform = c.platform === checkedPlatform;
        return (
          <StaticKeyboardVariantPicker
            // Must be unique per (kbd, layout, platform) — DeviceVariant
            // values like "primary" are deliberately reused across
            // platforms, unlike layout files or platform names, which
            // happen to already be globally unique within their own
            // uidPrefix. Without composing the platform in here, two
            // platforms that both have >1 variant would render two variant
            // tab bars with colliding radio name/id — see
            // StaticKeyboardVariantPicker's own doc comment.
            uidPrefix={`${uidPrefix}-${c.platform}`}
            combos={c.variantCombos}
            initialVariant={initialVariant}
            initialLayer={initialLayer}
            requestedWidth={requestedWidth}
            checkedVariant={isActivePlatform ? checkedVariant : undefined}
            onVariantChange={isActivePlatform ? onVariantChange : undefined}
            embedHydration={isActivePlatform ? embedHydration : undefined}
          />
        );
      }}
    />
  );
}
