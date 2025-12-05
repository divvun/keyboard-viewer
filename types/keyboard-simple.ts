/**
 * Simplified keyboard types for basic viewer
 */

import type { Platform, DeviceVariant } from "../constants/platforms.ts";

/**
 * All possible keyboard layers across platforms
 */
export interface KeyLayers {
  default: string;
  shift?: string;
  caps?: string;
  "caps+shift"?: string;
  alt?: string;
  "alt+shift"?: string;
  ctrl?: string;
  "ctrl+shift"?: string;
  cmd?: string;
  "cmd+shift"?: string;
  "cmd+alt"?: string;
  "cmd+alt+shift"?: string;
  "alt+caps"?: string;
  "symbols-1"?: string; // Mobile symbol layer
  "symbols-2"?: string; // Mobile symbol layer
}

/**
 * A single key on the keyboard
 */
export interface Key {
  /** Unique identifier (e.g., "KeyA", "Digit1") */
  id: string;
  /** Character outputs for different modifier combinations */
  layers: KeyLayers;
  /** Display label (defaults to layers.default if not provided) */
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
 * Deadkey combinations: maps deadkey character to its possible combinations
 * Example: { "`": { "a": "à", "e": "è" } }
 */
export interface DeadkeyCombinations {
  [deadkey: string]: {
    [baseChar: string]: string;
  };
}

/**
 * Complete keyboard layout
 */
export interface KeyboardLayout {
  id: string;
  name: string;
  rows: KeyRow[];
  deadkeys?: DeadkeyCombinations;
  isMobile?: boolean; // Whether this is a mobile keyboard layout
  platform?: Platform; // Platform name (iOS, android, macOS, etc.)
  variant?: DeviceVariant; // Variant name for mobile (primary, iPad-9in, etc.)
}
