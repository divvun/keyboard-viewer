import type { KeyboardLayout } from "./keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import type { DeviceVariant, Platform } from "../constants/platforms.ts";

/**
 * Plain types shared by the combo-tree builders (utils/combo-tree.ts,
 * utils/build-layout-combo.ts) and the tab-picker components
 * (components/StaticKeyboard*Picker.tsx). Kept out of any .tsx file so pure,
 * zero-fetch, browser-safe code (build-layout-combo.ts) never has to import
 * from a JSX module.
 */

export interface VariantCombo {
  variant: DeviceVariant;
  layout: KeyboardLayout;
  layers: LayerState[];
}

/** Every platform always has at least one variant combo — desktop platforms
 * get a single "primary" entry, which collapses to no tab bar via
 * CssTabPicker's `items.length <= 1` rule. Only mobile platforms (iOS,
 * Android) can have more than one. */
export interface PlatformCombo {
  platform: Platform;
  variantCombos: VariantCombo[];
}

export interface LayoutCombo {
  /** Layout file name without the .yaml extension, e.g. "smj-NO". */
  file: string;
  /** Human-readable label, e.g. from the file's displayNames.en. */
  displayName: string;
  platformCombos: PlatformCombo[];
}
