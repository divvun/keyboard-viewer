import type { Platform } from "../constants/platforms.ts";
import { slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import {
  computePlatformPickerHeightPx,
  type PlatformCombo,
  StaticKeyboardPlatformPicker,
} from "./StaticKeyboardPlatformPicker.tsx";

export type { PlatformCombo };

export interface LayoutCombo {
  /** Layout file name without the .yaml extension, e.g. "smj-NO". */
  file: string;
  /** Human-readable label, e.g. from the file's displayNames.en. */
  displayName: string;
  platformCombos: PlatformCombo[];
}

interface StaticKeyboardLayoutPickerProps {
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialPlatform: Platform;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
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
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computePlatformPickerHeightPx(
      combos[0].platformCombos,
      initialPlatform,
      requestedWidth,
    );
  }
  const checked = combos.find((c) => c.file === initialFile) ?? combos[0];
  return TAB_BAR_HEIGHT_PX +
    computePlatformPickerHeightPx(
      checked.platformCombos,
      initialPlatform,
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
  initialLayer,
  requestedWidth,
}: StaticKeyboardLayoutPickerProps) {
  const checkedFile = combos.some((c) => c.file === initialFile)
    ? initialFile
    : combos[0].file;

  return (
    <CssTabPicker
      dimension="layout"
      uid={slugifyId(kbd)}
      caption="Layout:"
      checkedId={slugifyId(checkedFile)}
      items={combos.map((c) => ({
        id: slugifyId(c.file),
        label: c.displayName,
        ariaLabel: `Keyboard layout: ${c.displayName}`,
        value: c,
      }))}
      renderView={({ value: c }) => (
        <StaticKeyboardPlatformPicker
          uidPrefix={`${kbd}-${c.file}`}
          combos={c.platformCombos}
          initialPlatform={initialPlatform}
          initialLayer={initialLayer}
          requestedWidth={requestedWidth}
        />
      )}
    />
  );
}
