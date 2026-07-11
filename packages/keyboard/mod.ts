/**
 * The common keyboard-rendering core, shared between the viewer app and
 * borealium. Server-rendered it is a complete zero-JS keyboard
 * (radio/:checked layer machinery); hydrated inside an island it gains
 * typing, deadkey composition, textarea-scoped hardware capture, and
 * container refit. Import `@divvun/keyboard/keyboard.css` once per host —
 * every rule is scoped under .dvk-*, no global resets.
 */

export { Keyboard, type KeyboardProps } from "./components/Keyboard.tsx";
export {
  KeyboardPicker,
  type KeyboardPickerProps,
  type KeyboardSelection,
} from "./components/KeyboardPicker.tsx";
export {
  computeStaticEmbedHeightPx,
  type KeyboardEmbedHydration,
  StaticKeyboardEmbed,
} from "./components/StaticKeyboardEmbed.tsx";
export {
  computeLayoutPickerHeightPx,
  StaticKeyboardLayoutPicker,
} from "./components/StaticKeyboardLayoutPicker.tsx";
export {
  computePlatformPickerHeightPx,
  StaticKeyboardPlatformPicker,
} from "./components/StaticKeyboardPlatformPicker.tsx";
export {
  computeVariantPickerHeightPx,
  StaticKeyboardVariantPicker,
} from "./components/StaticKeyboardVariantPicker.tsx";
export { KeyboardDisplay } from "./components/KeyboardDisplay.tsx";
export { githubApiHeaders, githubRawHeaders } from "./utils/github.ts";
export type {
  LayoutCombo,
  PlatformCombo,
  VariantCombo,
} from "./types/combo-tree.ts";

// Server-side data layer: fetch + transform kbdgen layouts
export {
  fetchKbdgenData,
  type KbdgenFetchResult,
  LayoutNotFoundError,
} from "./utils/fetch-kbdgen.ts";
export {
  type LoadedKeyboard,
  loadKeyboardLayout,
} from "./utils/load-layout.ts";
export type { KeyboardParams } from "./utils/params.ts";
export { listLayoutFiles } from "./utils/list-layouts.ts";
export {
  type BuildComboTreeOptions,
  buildKeyboardComboTree,
  type KeyboardComboTree,
} from "./utils/combo-tree.ts";
export { buildLayoutComboFromKbdgenData } from "./utils/build-layout-combo.ts";
export {
  getAvailablePlatforms,
  getMobileVariants,
  type KbdgenLayout,
  transformKbdgenToLayout,
} from "./utils/kbdgen-transform.ts";

// Layer/modifier model
export {
  enumerateLayers,
  layerNameToId,
  type LayerState,
} from "./utils/layer-state.ts";
export * from "./utils/modifiers.ts";
export * from "./utils/key-helpers.ts";
export { decodeUnicodeEscapes } from "./utils/text.ts";

// Types and constants
export type {
  DeadkeyCombinations,
  Key,
  KeyboardLayout,
  KeyLayers,
  KeyRow,
} from "./types/keyboard-simple.ts";
export * from "./constants/key-ids.ts";
export {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  DeviceVariant,
  Platform,
  VariantDisplayNames,
} from "./constants/platforms.ts";
