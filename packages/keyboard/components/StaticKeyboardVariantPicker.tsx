import {
  type DeviceVariant,
  VariantDisplayNames,
} from "../constants/platforms.ts";
import { slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import {
  computeStaticEmbedHeightPx,
  type KeyboardEmbedHydration,
  StaticKeyboardEmbed,
} from "./StaticKeyboardEmbed.tsx";
import type { VariantCombo } from "../types/combo-tree.ts";

export type { VariantCombo };

interface StaticKeyboardVariantPickerProps {
  /** Unique per (kbd, layout, platform) — the caller (StaticKeyboardPlatformPicker)
   * MUST compose the platform into this, since DeviceVariant values like
   * "primary" are deliberately reused across platforms — unlike layout files
   * or platform names, which happen to already be globally unique within
   * their own uidPrefix. Two platforms that both have >1 variant sharing an
   * uidPrefix would produce colliding radio name/id and silently steal each
   * other's checked state (native HTML radio `name` scoping is document-wide,
   * not DOM-ancestry-based). */
  uidPrefix: string;
  combos: VariantCombo[];
  initialVariant: DeviceVariant;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
  /** Hydration hooks: which variant is checked (overrides the initialVariant
   * fallback below) and a callback fired when the user switches variant tabs.
   * Both optional — absent in pure-static SSR usage, used by the hydrated
   * KeyboardPicker component. */
  checkedVariant?: DeviceVariant;
  onVariantChange?: (variant: DeviceVariant) => void;
  /** Forwarded straight into the nested StaticKeyboardEmbed's layer picker. */
  embedHydration?: KeyboardEmbedHydration;
}

/**
 * Total rendered height (px) of a `StaticKeyboardVariantPicker` for the
 * variant that would actually be checked at SSR time — mirrors the
 * `checkedVariant` fallback logic in the component below exactly.
 */
export function computeVariantPickerHeightPx(
  combos: VariantCombo[],
  initialVariant: DeviceVariant,
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computeStaticEmbedHeightPx(combos[0].layout, requestedWidth);
  }
  const checked = combos.find((c) => c.variant === initialVariant) ??
    combos[0];
  return TAB_BAR_HEIGHT_PX +
    computeStaticEmbedHeightPx(checked.layout, requestedWidth);
}

/**
 * Renders a single keyboard when only one device variant is in scope for
 * this platform (the common case — every desktop platform, and most mobile
 * ones). When a platform declares more than one variant (e.g. iOS primary +
 * iPad-9in + iPad-12in), renders an outer variant tab bar above the
 * keyboard, toggled the same pure-CSS radio way as the layer/platform/layout
 * tabs. The tab bar itself is unscaled UI chrome — only the nested keyboard
 * (via `StaticKeyboardEmbed`) scales to `requestedWidth`.
 */
export function StaticKeyboardVariantPicker({
  uidPrefix,
  combos,
  initialVariant,
  initialLayer,
  requestedWidth,
  checkedVariant: checkedVariantProp,
  onVariantChange,
  embedHydration,
}: StaticKeyboardVariantPickerProps) {
  const checkedVariant = checkedVariantProp ??
    (combos.some((c) => c.variant === initialVariant)
      ? initialVariant
      : combos[0].variant);

  return (
    <CssTabPicker
      dimension="variant"
      uid={slugifyId(uidPrefix)}
      caption="Device:"
      checkedId={slugifyId(checkedVariant)}
      onCheck={onVariantChange &&
        ((item) => onVariantChange(item.value.variant))}
      items={combos.map((c) => ({
        id: slugifyId(c.variant),
        label: VariantDisplayNames[c.variant] ?? c.variant,
        ariaLabel: `Device: ${VariantDisplayNames[c.variant] ?? c.variant}`,
        data: { "data-variant": c.variant },
        value: c,
      }))}
      renderView={({ value: c }) => (
        <StaticKeyboardEmbed
          layout={c.layout}
          layers={c.layers}
          initialLayer={initialLayer}
          requestedWidth={requestedWidth}
          {
            // Only the checked variant is ever visible — same guard as
            // StaticKeyboardPlatformPicker/StaticKeyboardLayoutPicker use for
            // their own dimension, so switching tabs/typing doesn't re-render
            // every other variant's key grid on every keystroke.
            ...(c.variant === checkedVariant ? embedHydration : undefined)
          }
        />
      )}
    />
  );
}
