/**
 * Type definitions for keyboard layouts
 */

/**
 * Layer/modifier state enum
 */
export enum Layer {
  Default = "default",
  Shift = "shift",
  Alt = "alt",
  AltShift = "altShift",
  Caps = "caps",
  CapsShift = "capsShift",
  Cmd = "cmd",
  CmdShift = "cmdShift",
  CmdAlt = "cmdAlt",
  CmdAltShift = "cmdAltShift",
}

/**
 * Physical layout types
 */
export enum PhysicalLayout {
  ISO = "iso",
  ANSI = "ansi",
  JIS = "jis",
}

/**
 * A key's output for different modifier states
 */
export type KeyOutput = {
  [Layer.Default]: string;
  [Layer.Shift]?: string;
  [Layer.Alt]?: string;
  [Layer.AltShift]?: string;
  [Layer.Caps]?: string;
  [Layer.CapsShift]?: string;
  [Layer.Cmd]?: string;
  [Layer.CmdShift]?: string;
  [Layer.CmdAlt]?: string;
  [Layer.CmdAltShift]?: string;
};

/**
 * Physical key definition
 */
export interface KeyDefinition {
  /** Unique identifier for the key (e.g., "KeyA", "Digit1") */
  id: string;
  /** Relative width of the key (1.0 = standard key width) */
  width: number;
  /** Visual label for the key cap (for non-letter keys like Tab, Enter, etc.) */
  label?: string;
  /** Character outputs for different modifier states */
  output?: KeyOutput;
  /** Whether this key is a dead key in specific layers */
  deadKey?: Partial<Record<Layer, boolean>>;
}

/**
 * A row of keys
 */
export interface KeyRow {
  /** Keys in this row from left to right */
  keys: KeyDefinition[];
  /** Optional left offset for the row (in key widths) */
  offset?: number;
}

/**
 * Transform rule for dead key combinations
 */
export interface TransformRule {
  /** The dead key character */
  deadKey: string;
  /** Map of trigger character -> output character */
  transforms: Record<string, string>;
}

/**
 * Complete keyboard layout definition
 */
export interface KeyboardLayout {
  /** Unique identifier for this layout */
  id: string;
  /** Human-readable name */
  name: string;
  /** Display names in different languages */
  displayNames?: Record<string, string>;
  /** Physical layout type */
  physicalLayout: PhysicalLayout;
  /** Rows of keys from top to bottom */
  rows: KeyRow[];
  /** Transform rules for dead keys */
  transforms: TransformRule[];
}

/**
 * Active modifier state
 */
export interface ModifierState {
  shift: boolean;
  alt: boolean;
  caps: boolean;
  cmd: boolean;
}

/**
 * Dead key state for composition
 */
export interface DeadKeyState {
  /** The active dead key character */
  character: string | null;
  /** Which layer it was pressed in */
  layer: Layer | null;
}
