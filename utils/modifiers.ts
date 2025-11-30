/**
 * Modifier state management and layer computation
 */

export interface ModifierState {
  shift: boolean;
  caps: boolean;
  alt: boolean;
  cmd: boolean;
  ctrl: boolean;
}

/**
 * Creates an initial modifier state with all modifiers off
 */
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
 * - caps+shift
 * - caps
 * - shift
 * - default
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
 * Returns a human-readable name for the active layer
 */
export function getLayerDisplayName(layer: string): string {
  if (layer === "default") return "Default";

  // Convert layer name to display format
  return layer
    .split("+")
    .map(mod => {
      switch (mod) {
        case "cmd": return "Cmd";
        case "alt": return "Alt";
        case "ctrl": return "Ctrl";
        case "shift": return "Shift";
        case "caps": return "Caps";
        default: return mod;
      }
    })
    .join(" + ");
}
