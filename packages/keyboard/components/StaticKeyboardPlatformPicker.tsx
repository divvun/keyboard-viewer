import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import type { Platform } from "../constants/platforms.ts";
import { slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import {
  computeStaticEmbedHeightPx,
  type KeyboardEmbedHydration,
  StaticKeyboardEmbed,
} from "./StaticKeyboardEmbed.tsx";

export interface PlatformCombo {
  platform: Platform;
  layout: KeyboardLayout;
  layers: LayerState[];
}

interface StaticKeyboardPlatformPickerProps {
  /** Unique per (kbd, layout) — keeps radio names from colliding when this
   * picker is nested once per layout inside StaticKeyboardLayoutPicker. */
  uidPrefix: string;
  combos: PlatformCombo[];
  initialPlatform: Platform;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
  /** Hydration hooks: which platform is checked (overrides the initialPlatform
   * fallback below) and a callback fired when the user switches platform tabs.
   * Both optional — absent in pure-static SSR usage (the /embed route's
   * non-interactive path), used by the hydrated KeyboardPicker component. */
  checkedPlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
  /** Forwarded straight into the nested StaticKeyboardEmbed's layer picker —
   * see KeyboardEmbedHydration's doc comment. */
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
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computeStaticEmbedHeightPx(combos[0].layout, requestedWidth);
  }
  const checked = combos.find((c) => c.platform === initialPlatform) ??
    combos[0];
  return TAB_BAR_HEIGHT_PX +
    computeStaticEmbedHeightPx(checked.layout, requestedWidth);
}

/**
 * Renders a single keyboard when only one platform is in scope for this
 * layout (the common case). When a layout file declares more than one
 * platform (e.g. mhr declares all five), renders an outer platform tab bar
 * above the keyboard, toggled the same pure-CSS radio way as the layer and
 * layout tabs. The tab bar itself is unscaled UI chrome — only the nested
 * keyboards (via `StaticKeyboardEmbed`) scale to `requestedWidth`.
 */
export function StaticKeyboardPlatformPicker({
  uidPrefix,
  combos,
  initialPlatform,
  initialLayer,
  requestedWidth,
  checkedPlatform: checkedPlatformProp,
  onPlatformChange,
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
      renderView={({ value: c }) => (
        <StaticKeyboardEmbed
          layout={c.layout}
          layers={c.layers}
          initialLayer={initialLayer}
          requestedWidth={requestedWidth}
          {...embedHydration}
        />
      )}
    />
  );
}
