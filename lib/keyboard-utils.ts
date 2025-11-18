import type {
  DeadKeyState,
  KeyDefinition,
  KeyboardLayout,
  Layer,
  ModifierState,
} from "../types/keyboard.ts";
import { Layer as LayerEnum } from "../types/keyboard.ts";

/**
 * Get the current layer based on modifier state
 */
export function getCurrentLayer(modifiers: ModifierState): Layer {
  if (modifiers.cmd && modifiers.alt && modifiers.shift) {
    return LayerEnum.CmdAltShift;
  }
  if (modifiers.cmd && modifiers.alt) return LayerEnum.CmdAlt;
  if (modifiers.cmd && modifiers.shift) return LayerEnum.CmdShift;
  if (modifiers.cmd) return LayerEnum.Cmd;
  if (modifiers.alt && modifiers.shift) return LayerEnum.AltShift;
  if (modifiers.alt) return LayerEnum.Alt;
  if (modifiers.caps && modifiers.shift) return LayerEnum.CapsShift;
  if (modifiers.caps) return LayerEnum.Caps;
  if (modifiers.shift) return LayerEnum.Shift;
  return LayerEnum.Default;
}

/**
 * Get the output character for a key given the current modifiers
 */
export function getKeyOutput(
  key: KeyDefinition,
  modifiers: ModifierState,
): string | null {
  if (!key.output) return null;

  const layer = getCurrentLayer(modifiers);

  // Try to get output for the specific layer, fall back to default
  const output = key.output[layer] ?? key.output[LayerEnum.Default];

  return output || null;
}

/**
 * Check if a key is a dead key in the current layer
 */
export function isDeadKey(
  key: KeyDefinition,
  modifiers: ModifierState,
): boolean {
  if (!key.deadKey) return false;

  const layer = getCurrentLayer(modifiers);
  return key.deadKey[layer] ?? false;
}

/**
 * Apply a dead key transform if one exists
 */
export function applyDeadKeyTransform(
  layout: KeyboardLayout,
  deadKeyState: DeadKeyState,
  triggerChar: string,
): string | null {
  if (!deadKeyState.character) return null;

  const rule = layout.transforms.find((r) =>
    r.deadKey === deadKeyState.character
  );
  if (!rule) return null;

  return rule.transforms[triggerChar] ?? null;
}

/**
 * Process a key press and return the resulting output
 */
export function processKeyPress(
  layout: KeyboardLayout,
  key: KeyDefinition,
  modifiers: ModifierState,
  deadKeyState: DeadKeyState,
): {
  output: string | null;
  newDeadKeyState: DeadKeyState;
  clearModifiers: boolean;
} {
  const output = getKeyOutput(key, modifiers);
  const isDead = isDeadKey(key, modifiers);

  // If we have an active dead key, try to apply transform
  if (deadKeyState.character && output) {
    const transformed = applyDeadKeyTransform(layout, deadKeyState, output);

    if (transformed) {
      // Successful transform - output the combined character
      return {
        output: transformed,
        newDeadKeyState: { character: null, layer: null },
        clearModifiers: !modifiers.caps, // Clear modifiers except caps
      };
    } else {
      // No transform found - output dead key, then current character
      return {
        output: deadKeyState.character + (output || ""),
        newDeadKeyState: { character: null, layer: null },
        clearModifiers: !modifiers.caps,
      };
    }
  }

  // If this is a dead key, activate it
  if (isDead && output) {
    return {
      output: null, // Don't output anything yet
      newDeadKeyState: {
        character: output,
        layer: getCurrentLayer(modifiers),
      },
      clearModifiers: false, // Keep modifiers for visual feedback
    };
  }

  // Normal key press
  return {
    output,
    newDeadKeyState: { character: null, layer: null },
    clearModifiers: !modifiers.caps, // Clear modifiers except caps
  };
}

/**
 * Get a display character for a key (what to show on the key cap)
 */
export function getKeyDisplayChar(
  key: KeyDefinition,
  showLayer: Layer = LayerEnum.Default,
): string {
  if (key.label) return key.label;
  if (!key.output) return "";

  const char = key.output[showLayer] ?? key.output[LayerEnum.Default];

  // Show space as a special character
  if (char === " ") return "␣";

  // Show certain control characters symbolically
  if (char === "\t") return "⇥";
  if (char === "\n") return "↵";

  return char || "";
}
