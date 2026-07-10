import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { DEFAULT_PLATFORM } from "../constants/platforms.ts";
import { KeyboardPicker } from "./KeyboardPicker.tsx";
import type { LayoutCombo } from "./StaticKeyboardLayoutPicker.tsx";

export interface KeyboardProps {
  layout: KeyboardLayout;
  layers: LayerState[];
  initialLayer?: string;
  /** Scale keyboard to this pixel width for the no-JS render. Once hydrated,
   * the keyboard re-fits itself to its container via ResizeObserver. */
  requestedWidth?: number;
}

/**
 * THE single-layout keyboard component — a thin wrapper over
 * `KeyboardPicker` (components/KeyboardPicker.tsx) with a one-entry
 * `combos` array. Safe because `CssTabPicker` already collapses to no
 * tab-bar chrome whenever a dimension has only one item, so this renders
 * byte-identical markup to a direct single-combo render — use this when you
 * already know exactly which layout/platform to show and don't need
 * layout/platform tabs; use `KeyboardPicker` directly for the full picker
 * tree.
 */
export function Keyboard(
  { layout, layers, initialLayer = "default", requestedWidth }: KeyboardProps,
) {
  const platform = layout.platform ?? DEFAULT_PLATFORM;
  const combos: LayoutCombo[] = [{
    file: layout.id,
    displayName: layout.name,
    platformCombos: [{ platform, layout, layers }],
  }];

  return (
    <KeyboardPicker
      kbd={layout.id}
      combos={combos}
      initialFile={layout.id}
      initialPlatform={platform}
      initialLayer={initialLayer}
      requestedWidth={requestedWidth}
    />
  );
}
