import type { KeyboardLayout, Key } from "../types/keyboard-simple.ts";

/**
 * Transforms keyboard layouts from kbdgen format (used by giellalt)
 * into our internal keyboard layout representation.
 *
 * The kbdgen format represents keyboard layouts as multi-line strings where:
 * - Each line represents a physical row on the keyboard
 * - Characters are separated by spaces
 * - Multiple layers (default, shift, alt, etc.) define different outputs per key
 * - Transforms define deadkey combinations (e.g., ´ + a = á)
 */

// Type Definitions for kbdgen YAML Structure

interface KbdgenTransform {
  [deadkey: string]: {
    [baseChar: string]: string;
  };
}

interface KbdgenLayers {
  default?: string;
  shift?: string;
  caps?: string;
  "caps+shift"?: string;
  alt?: string;
  "alt+shift"?: string;
  cmd?: string;
  "cmd+shift"?: string;
  ctrl?: string;
  "ctrl+shift"?: string;
  "alt+caps"?: string;
  "cmd+alt"?: string;
  "cmd+alt+shift"?: string;
}

interface KbdgenPrimary {
  layers?: KbdgenLayers;
}

interface KbdgenSpace {
  default?: string;
  shift?: string;
  caps?: string;
  alt?: string;
}

interface KbdgenDeadKeys {
  default?: string[];
  shift?: string[];
  caps?: string[];
  alt?: string[];
}

interface KbdgenPlatformData {
  primary?: KbdgenPrimary;
  space?: KbdgenSpace;
  deadKeys?: KbdgenDeadKeys;
  transforms?: KbdgenTransform;
}

export interface KbdgenLayout {
  displayNames?: { [lang: string]: string };
  locale?: string;
  macOS?: KbdgenPlatformData;
  windows?: KbdgenPlatformData;
  android?: KbdgenPlatformData;
  iOS?: KbdgenPlatformData;
  chrome?: KbdgenPlatformData;
  chromeOS?: KbdgenPlatformData;
  transforms?: KbdgenTransform;
}

/**
 * Physical positions of printable keys on an ISO keyboard layout.
 * Each sub-array represents one row of keys, from top to bottom.
 * These are the standard key codes used by the browser's KeyboardEvent API.
 */
const ISO_KEY_POSITIONS = {
  row1: ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  row2: ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"],
  row3: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Backslash"],
  row4: ["IntlBackslash", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
};

/**
 * Special (non-printable) keys with their display properties.
 * These keys don't produce regular character output but have special functions.
 */
const SPECIAL_KEYS: Record<string, Key> = {
  backspace: { id: "Backspace", output: "\b", label: "⌫", width: 2.0, type: "modifier" },
  tab: { id: "Tab", output: "\t", label: "Tab", width: 1.5, type: "modifier" },
  enter: { id: "Enter", output: "\n", label: "Enter", width: 1.3, height: 2.075, type: "enter" },
  capsLock: { id: "CapsLock", output: "", label: "Caps", width: 1.75, type: "modifier" },
  shiftLeft: { id: "ShiftLeft", output: "", label: "Shift", width: 1.25, type: "modifier" },
  shiftRight: { id: "ShiftRight", output: "", label: "Shift", width: 2.75, type: "modifier" },
  controlLeft: { id: "ControlLeft", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
  metaLeft: { id: "MetaLeft", output: "", label: "⌘", width: 1.25, type: "modifier" },
  altLeft: { id: "AltLeft", output: "", label: "Alt", width: 1.25, type: "modifier" },
  space: { id: "Space", output: " ", label: "", width: 6.25, type: "space" },
  altRight: { id: "AltRight", output: "", label: "Alt", width: 1.25, type: "modifier" },
  metaRight: { id: "MetaRight", output: "", label: "⌘", width: 1.25, type: "modifier" },
  controlRight: { id: "ControlRight", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
};

/**
 * Parses a kbdgen layer string into a 2D array of characters.
 *
 * kbdgen represents keyboard layers as multi-line strings where:
 * - Each line = one row of the keyboard
 * - Characters are separated by whitespace
 *
 * Example input:
 *   "' 1 2 3 4 5\n  q w e r t y"
 *
 * Example output:
 *   [["'", "1", "2", "3", "4", "5"], ["q", "w", "e", "r", "t", "y"]]
 */
function parseLayerString(layerString: string): string[][] {
  const lines = layerString.trim().split("\n");
  return lines.map((line) => line.trim().split(/\s+/));
}

/**
 * Extracts platform-specific layers and transforms from kbdgen data.
 * All platforms use the nested primary.layers structure in kbdgen format.
 */
function extractPlatformData(
  kbdgenData: KbdgenLayout,
  platform: string,
): { layers: KbdgenLayers; transforms: KbdgenTransform } {
  // Get the platform data (macOS, windows, android, iOS, chrome, chromeOS)
  const platformData = kbdgenData[platform as keyof KbdgenLayout] as
    | KbdgenPlatformData
    | undefined;

  if (!platformData) {
    throw new Error(`Platform "${platform}" not found in layout`);
  }

  // Extract layers from primary.layers
  const layers = platformData.primary?.layers;
  if (!layers || !layers.default) {
    throw new Error(`No layers found for platform "${platform}"`);
  }

  // Get platform-specific transforms
  const platformTransforms = platformData.transforms || {};

  // Merge top-level transforms (shared across platforms) with platform-specific transforms
  const allTransforms = {
    ...(kbdgenData.transforms || {}),
    ...platformTransforms,
  };

  return { layers, transforms: allTransforms };
}

/**
 * Creates a keyboard row from layer data and key positions.
 */
function createKeyboardRow(
  keyPositions: string[],
  defaultLayerRow: string[],
  shiftLayerRow: string[] | undefined,
) {
  return keyPositions.map((keyId, index) => ({
    id: keyId,
    output: defaultLayerRow[index] || "",
    shiftOutput: shiftLayerRow?.[index] || undefined,
    width: 1.0,
  }));
}

/**
 * Transforms a kbdgen keyboard layout into our internal format.
 *
 * @param kbdgenData - The parsed kbdgen YAML layout data
 * @param platform - Platform to extract (e.g., "macOS", "windows")
 * @param repoCode - Language code (e.g., "sme" for Northern Sami)
 * @param layoutName - Layout variant name (e.g., "se-SE")
 * @returns A keyboard layout in our internal format
 */
export function transformKbdgenToLayout(
  kbdgenData: KbdgenLayout,
  platform: string,
  repoCode: string,
  layoutName: string,
): KeyboardLayout {
  // Extract layers and transforms for the requested platform
  const { layers, transforms } = extractPlatformData(kbdgenData, platform);

  // Parse the multi-line layer strings into 2D arrays
  const defaultLayer = parseLayerString(layers.default!);
  const shiftLayer = layers.shift ? parseLayerString(layers.shift) : null;

  // Convert transforms to deadkeys (both are the same structure)
  const deadkeys = transforms;

  // Build the keyboard rows
  const rows = [];

  // Row 1: Number row + Backspace
  if (defaultLayer[0]) {
    rows.push({
      keys: [
        ...createKeyboardRow(
          ISO_KEY_POSITIONS.row1,
          defaultLayer[0],
          shiftLayer?.[0],
        ),
        SPECIAL_KEYS.backspace,
      ],
    });
  }

  // Row 2: Tab + QWERTY row + Enter
  if (defaultLayer[1]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.tab,
        ...createKeyboardRow(
          ISO_KEY_POSITIONS.row2,
          defaultLayer[1],
          shiftLayer?.[1],
        ),
        SPECIAL_KEYS.enter,
      ],
    });
  }

  // Row 3: CapsLock + ASDF row
  if (defaultLayer[2]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.capsLock,
        ...createKeyboardRow(
          ISO_KEY_POSITIONS.row3,
          defaultLayer[2],
          shiftLayer?.[2],
        ),
      ],
    });
  }

  // Row 4: ShiftLeft + ZXCV row + ShiftRight
  if (defaultLayer[3]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.shiftLeft,
        ...createKeyboardRow(
          ISO_KEY_POSITIONS.row4,
          defaultLayer[3],
          shiftLayer?.[3],
        ),
        SPECIAL_KEYS.shiftRight,
      ],
    });
  }

  // Row 5: Bottom row
  rows.push({
    keys: [
      SPECIAL_KEYS.controlLeft,
      SPECIAL_KEYS.metaLeft,
      SPECIAL_KEYS.altLeft,
      SPECIAL_KEYS.space,
      SPECIAL_KEYS.altRight,
      SPECIAL_KEYS.metaRight,
      SPECIAL_KEYS.controlRight,
    ],
  });

  // Generate display name
  const displayName = kbdgenData.displayNames?.en ||
    kbdgenData.locale ||
    `${repoCode} - ${layoutName} (${platform})`;

  return {
    id: `${repoCode}-${layoutName}-${platform}`,
    name: displayName,
    deadkeys,
    rows,
  };
}

/**
 * Returns a list of supported platforms available in a kbdgen layout.
 * Only returns platforms supported by the viewer: macOS, Windows, and ChromeOS.
 *
 * @param kbdgenData - The parsed kbdgen YAML layout data
 * @returns Array of platform names (e.g., ["macOS", "windows", "chromeOS"])
 */
export function getAvailablePlatforms(kbdgenData: KbdgenLayout): string[] {
  const platforms: string[] = [];

  // Only include platforms supported by the viewer
  if (kbdgenData.macOS) platforms.push("macOS");
  if (kbdgenData.windows) platforms.push("windows");
  if (kbdgenData.chromeOS) platforms.push("chromeOS");

  return platforms;
}
