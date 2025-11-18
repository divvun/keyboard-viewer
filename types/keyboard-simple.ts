/**
 * Simplified keyboard types for basic viewer
 */

/**
 * A single key on the keyboard
 */
export interface Key {
  /** Unique identifier (e.g., "KeyA", "Digit1") */
  id: string;
  /** Character to output when clicked */
  output: string;
  /** Display label (defaults to output if not provided) */
  label?: string;
  /** Relative width (1.0 = standard key) */
  width?: number;
  /** Relative height (1.0 = standard key) */
  height?: number;
  /** Key type for special styling */
  type?: "normal" | "space" | "enter" | "modifier" | "function";
}

/**
 * A row of keys
 */
export interface KeyRow {
  keys: Key[];
  /** Left offset in key widths */
  offset?: number;
}

/**
 * Complete keyboard layout
 */
export interface KeyboardLayout {
  id: string;
  name: string;
  rows: KeyRow[];
}
