export interface ModifierState {
  shift: boolean;
  caps: boolean;
  alt: boolean;
  cmd: boolean;
  ctrl: boolean;
}

export function createModifierState(): ModifierState {
  return {
    shift: false,
    caps: false,
    alt: false,
    cmd: false,
    ctrl: false,
  };
}

/**
 * Computes the active layer name based on the current modifier state.
 * Returns layer names in the canonical order used by kbdgen files.
 *
 * Layer priority (most specific to least specific):
 * - cmd+alt+shift
 * - cmd+alt
 * - cmd+shift
 * - cmd
 * - alt+shift
 * - alt+caps
 * - alt
 * - ctrl+shift
 * - ctrl
 * - caps+shift (falls back to shift if not available)
 * - caps
 * - shift
 * - default
 *
 * Note: Some combinations like caps+shift may fall back to shift layer
 * if the caps+shift layer is not defined in the keyboard layout.
 */
export function getActiveLayer(modifiers: ModifierState): string {
  const { shift, caps, alt, cmd, ctrl } = modifiers;

  // Command key combinations (macOS only)
  if (cmd && alt && shift) return "cmd+alt+shift";
  if (cmd && alt) return "cmd+alt";
  if (cmd && shift) return "cmd+shift";
  if (cmd) return "cmd";

  // Alt combinations
  if (alt && shift) return "alt+shift";
  if (alt && caps) return "alt+caps";
  if (alt) return "alt";

  // Ctrl combinations
  if (ctrl && shift) return "ctrl+shift";
  if (ctrl) return "ctrl";

  // Caps combinations
  if (caps && shift) return "caps+shift";
  if (caps) return "caps";

  // Shift alone
  if (shift) return "shift";

  // Default layer
  return "default";
}

/**
 * Returns the fallback chain for a given layer.
 * The first layer in the array is the requested layer, followed by fallbacks in order.
 *
 * This is the single source of truth for layer fallback logic.
 */
export function getLayerFallbackChain(layer: string): string[] {
  switch (layer) {
    case "caps+shift":
      return ["caps+shift", "shift", "default"];
    case "symbols-2":
      return ["symbols-2", "symbols-1", "default"];
    default:
      return [layer, "default"];
  }
}

/**
 * Gets the effective layer name, accounting for fallbacks.
 * For example, "caps+shift" falls back to "shift" if no keys have a caps+shift layer.
 */
export function getEffectiveLayer(
  requestedLayer: string,
  layout: { rows: Array<{ keys: Array<{ layers: Record<string, unknown> }> }> } | null,
): string {
  if (!layout) return requestedLayer;

  const fallbackChain = getLayerFallbackChain(requestedLayer);

  // Find the first layer in the fallback chain that exists in the layout
  for (const layer of fallbackChain) {
    const hasLayer = layout.rows.some((row) =>
      row.keys.some((key) => key.layers[layer] !== undefined)
    );
    if (hasLayer) {
      return layer;
    }
  }

  // Fallback to the requested layer if nothing found (shouldn't happen if "default" is in chain)
  return requestedLayer;
}

/**
 * Returns a human-readable name for the active layer
 */
export function getLayerDisplayName(layer: string): string {
  if (layer === "default") return "Default";

  // Convert layer name to display format
  return layer
    .split("+")
    .map((mod) => {
      switch (mod) {
        case "cmd":
          return "Cmd";
        case "alt":
          return "Alt";
        case "ctrl":
          return "Ctrl";
        case "shift":
          return "Shift";
        case "caps":
          return "Caps";
        default:
          return mod;
      }
    })
    .join(" + ");
}
