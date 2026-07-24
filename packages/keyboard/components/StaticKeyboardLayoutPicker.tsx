import type { JSX } from "preact";
import type { DeviceVariant, Platform } from "../constants/platforms.ts";
import { slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import type { KeyboardEmbedHydration } from "./StaticKeyboardEmbed.tsx";
import type { LayoutCombo, PlatformCombo } from "../types/combo-tree.ts";
import {
  computePlatformPickerHeightPx,
  StaticKeyboardPlatformPicker,
} from "./StaticKeyboardPlatformPicker.tsx";

export type { LayoutCombo, PlatformCombo };

interface StaticKeyboardLayoutPickerProps {
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialPlatform: Platform;
  initialVariant: DeviceVariant;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
  /** Hydration hooks: which layout file is checked (overrides the
   * initialFile fallback below) and a callback fired when the user switches
   * layout tabs. Both optional — absent in pure-static SSR usage, used by
   * the hydrated KeyboardPicker component. */
  checkedFile?: string;
  onFileChange?: (file: string) => void;
  /** Forwarded straight into the nested StaticKeyboardPlatformPicker. */
  checkedPlatform?: Platform;
  onPlatformChange?: (platform: Platform) => void;
  /** Forwarded through into the nested StaticKeyboardVariantPicker. */
  checkedVariant?: DeviceVariant;
  onVariantChange?: (variant: DeviceVariant) => void;
  /** Forwarded through all nested levels into StaticKeyboardEmbed. */
  embedHydration?: KeyboardEmbedHydration;
}

/**
 * Total rendered height (px) of a `StaticKeyboardLayoutPicker` for the layout
 * that would actually be checked at SSR time — mirrors the `checkedFile`
 * fallback logic in the component below exactly, so the height this reports
 * always matches what gets rendered.
 */
export function computeLayoutPickerHeightPx(
  combos: LayoutCombo[],
  initialFile: string,
  initialPlatform: Platform,
  initialVariant: DeviceVariant,
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computePlatformPickerHeightPx(
      combos[0].platformCombos,
      initialPlatform,
      initialVariant,
      requestedWidth,
    );
  }
  const checked = combos.find((c) => c.file === initialFile) ?? combos[0];
  return TAB_BAR_HEIGHT_PX +
    computePlatformPickerHeightPx(
      checked.platformCombos,
      initialPlatform,
      initialVariant,
      requestedWidth,
    );
}

/**
 * Renders a single (nested platform-picker) keyboard when only one layout is
 * in scope (the common case). When multiple layout files exist for a kbd
 * (e.g. smj-NO/smj-SE), renders an outer layout tab bar above the keyboard,
 * toggled the same pure-CSS radio way as the layer tabs inside
 * `StaticKeyboardEmbed`. The tab bar itself is unscaled UI chrome — only the
 * nested keyboards scale to `requestedWidth`.
 */
export function StaticKeyboardLayoutPicker({
  kbd,
  combos,
  initialFile,
  initialPlatform,
  initialVariant,
  initialLayer,
  requestedWidth,
  checkedFile: checkedFileProp,
  onFileChange,
  checkedPlatform,
  onPlatformChange,
  checkedVariant,
  onVariantChange,
  embedHydration,
}: StaticKeyboardLayoutPickerProps): JSX.Element {
  const checkedFile = checkedFileProp ??
    (combos.some((c) => c.file === initialFile) ? initialFile : combos[0].file);

  return (
    <CssTabPicker
      dimension="layout"
      uid={slugifyId(kbd)}
      caption="Layout:"
      checkedId={slugifyId(checkedFile)}
      onCheck={onFileChange && ((item) => onFileChange(item.value.file))}
      items={combos.map((c) => ({
        id: slugifyId(c.file),
        label: c.displayName,
        ariaLabel: `Keyboard layout: ${c.displayName}`,
        data: { "data-layout-file": c.file },
        value: c,
      }))}
      renderView={({ value: c }) => {
        // Only the checked layout file is ever visible — scope the live
        // platform/variant/typing wiring to it so switching layers/typing
        // doesn't re-render every other layout file's whole platform x
        // variant x layer subtree on every keystroke.
        const isActiveFile = c.file === checkedFile;
        return (
          <StaticKeyboardPlatformPicker
            uidPrefix={`${kbd}-${c.file}`}
            combos={c.platformCombos}
            initialPlatform={initialPlatform}
            initialVariant={initialVariant}
            initialLayer={initialLayer}
            requestedWidth={requestedWidth}
            checkedPlatform={isActiveFile ? checkedPlatform : undefined}
            onPlatformChange={isActiveFile ? onPlatformChange : undefined}
            checkedVariant={isActiveFile ? checkedVariant : undefined}
            onVariantChange={isActiveFile ? onVariantChange : undefined}
            embedHydration={isActiveFile ? embedHydration : undefined}
          />
        );
      }}
    />
  );
}
