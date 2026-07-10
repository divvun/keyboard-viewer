import type {
  Key,
  KeyboardLayout,
  KeyLayers,
} from "../types/keyboard-simple.ts";
import { DeviceVariant, Platform } from "../constants/platforms.ts";

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
  "symbols-1"?: string; // Mobile symbol layer
  "symbols-2"?: string; // Mobile symbol layer
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

interface KbdgenMobileVariant {
  layers?: KbdgenLayers;
}

interface KbdgenPlatformData {
  primary?: KbdgenPrimary | KbdgenMobileVariant;
  "iPad-9in"?: KbdgenMobileVariant;
  "iPad-12in"?: KbdgenMobileVariant;
  "tablet-600"?: KbdgenMobileVariant;
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
  row1: [
    "Backquote",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
  ],
  row2: [
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
  ],
  row3: [
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
    "Backslash",
  ],
  row4: [
    "IntlBackslash",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash",
  ],
};

/**
 * Special (non-printable) keys with their display properties.
 * These keys don't produce regular character output but have special functions.
 */
const SPECIAL_KEYS: Record<string, Key> = {
  backspace: {
    id: "Backspace",
    layers: { default: "\b" },
    label: "⌫",
    width: 2.0,
    type: "modifier",
  },
  tab: {
    id: "Tab",
    layers: { default: "\t" },
    label: "Tab",
    width: 1.5,
    type: "modifier",
  },
  enter: {
    id: "Enter",
    layers: { default: "\n" },
    label: "Enter",
    width: 1.3,
    height: 2.075,
    type: "enter",
  },
  capsLock: {
    id: "CapsLock",
    layers: { default: "" },
    label: "Caps",
    width: 1.75,
    type: "modifier",
  },
  shiftLeft: {
    id: "ShiftLeft",
    layers: { default: "" },
    label: "Shift",
    width: 1.25,
    type: "modifier",
  },
  shiftRight: {
    id: "ShiftRight",
    layers: { default: "" },
    label: "Shift",
    width: 2.75,
    type: "modifier",
  },
  controlLeft: {
    id: "ControlLeft",
    layers: { default: "" },
    label: "Ctrl",
    width: 1.25,
    type: "modifier",
  },
  metaLeft: {
    id: "MetaLeft",
    layers: { default: "" },
    label: "⌘",
    width: 1.25,
    type: "modifier",
  },
  altLeft: {
    id: "AltLeft",
    layers: { default: "" },
    label: "Alt",
    width: 1.25,
    type: "modifier",
  },
  space: {
    id: "Space",
    layers: { default: " " },
    label: "",
    width: 6.25,
    type: "space",
  },
  altRight: {
    id: "AltRight",
    layers: { default: "" },
    label: "Alt",
    width: 1.25,
    type: "modifier",
  },
  metaRight: {
    id: "MetaRight",
    layers: { default: "" },
    label: "⌘",
    width: 1.25,
    type: "modifier",
  },
  controlRight: {
    id: "ControlRight",
    layers: { default: "" },
    label: "Ctrl",
    width: 1.25,
    type: "modifier",
  },
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

function isMobilePlatform(platform: Platform): boolean {
  return platform === Platform.IOS || platform === Platform.Android;
}

/**
 * Parses a mobile key string that may contain special syntax.
 * Mobile keys can be regular characters or special keys with syntax like:
 * - \s{shift:1.25} - Shift key with width 1.25
 * - \s{backspace:1.5} - Backspace with width 1.5
 * - \s{spacer:0.25} - Empty spacer with width 0.25
 *
 * Returns an object with the key info or null for spacers.
 */
interface ParsedMobileKey {
  char: string;
  width?: number;
  specialType?: string;
}

function parseMobileKey(keyString: string): ParsedMobileKey | null {
  // Check for special key syntax: \s{name:width} or \s{name}
  const specialKeyMatch = keyString.match(/\\s\{([^:}]+)(?::([0-9.]+))?\}/);

  if (specialKeyMatch) {
    const specialType = specialKeyMatch[1];
    const width = specialKeyMatch[2] ? parseFloat(specialKeyMatch[2]) : 1.0;

    // Spacers are not rendered as keys
    if (specialType === "spacer") {
      return null;
    }

    return {
      char: "",
      width,
      specialType,
    };
  }

  // Regular character key
  return {
    char: keyString,
    width: 1.0,
  };
}

/**
 * Parses a mobile layer string into rows of parsed keys.
 * Handles special mobile key syntax and filters out spacers.
 */
function parseMobileLayerString(layerString: string): ParsedMobileKey[][] {
  const lines = layerString.trim().split("\n");
  return lines.map((line) => {
    const keys = line.trim().split(/\s+/);
    return keys
      .map((key) => parseMobileKey(key))
      .filter((key): key is ParsedMobileKey => key !== null);
  });
}

/**
 * Gets available mobile variants for a platform.
 * iOS variants: primary, iPad-9in, iPad-12in
 * Android variants: primary, tablet-600
 * Returns empty array for non-mobile platforms.
 */
export function getMobileVariants(
  kbdgenData: KbdgenLayout,
  platform: Platform,
): DeviceVariant[] {
  // Only return variants for mobile platforms
  if (!isMobilePlatform(platform)) {
    return [];
  }

  const platformData = kbdgenData[platform as keyof KbdgenLayout] as
    | KbdgenPlatformData
    | undefined;

  if (!platformData) {
    return [];
  }

  const variants: DeviceVariant[] = [];

  if (platformData.primary) {
    variants.push(DeviceVariant.Primary);
  }

  if (platform === Platform.IOS) {
    if (platformData["iPad-9in"]) variants.push(DeviceVariant.IPad9in);
    if (platformData["iPad-12in"]) variants.push(DeviceVariant.IPad12in);
  } else if (platform === Platform.Android) {
    if (platformData["tablet-600"]) variants.push(DeviceVariant.Tablet600);
  }

  return variants;
}

/**
 * Extracts platform-specific layers and transforms from kbdgen data.
 * Supports both desktop platforms and mobile variants.
 */
function extractPlatformData(
  kbdgenData: KbdgenLayout,
  platform: Platform,
  variant: DeviceVariant = DeviceVariant.Primary,
): { layers: KbdgenLayers; transforms: KbdgenTransform } {
  // Get the platform data (macOS, windows, android, iOS, chrome, chromeOS)
  const platformData = kbdgenData[platform as keyof KbdgenLayout] as
    | KbdgenPlatformData
    | undefined;

  if (!platformData) {
    throw new Error(`Platform "${platform}" not found in layout`);
  }

  // For mobile platforms or non-primary variants, access the variant directly
  let layers: KbdgenLayers | undefined;

  if (variant !== DeviceVariant.Primary && isMobilePlatform(platform)) {
    const variantData = platformData[variant as keyof KbdgenPlatformData] as
      | KbdgenMobileVariant
      | undefined;
    layers = variantData?.layers;
  } else {
    layers = platformData.primary?.layers;
  }

  if (!layers || !layers.default) {
    throw new Error(
      `No layers found for platform "${platform}" variant "${variant}"`,
    );
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
 * Extracts characters from all available layers for each key position.
 */
function createKeyboardRow(
  keyPositions: string[],
  layersData: { [layerName: string]: string[][] },
  rowIndex: number,
) {
  return keyPositions.map((keyId, keyIndex): Key => {
    const layers: KeyLayers = {
      default: layersData.default?.[rowIndex]?.[keyIndex] || "",
    };

    // Extract all available layers
    const layerNames: (keyof KeyLayers)[] = [
      "shift",
      "caps",
      "caps+shift",
      "alt",
      "alt+shift",
      "ctrl",
      "ctrl+shift",
      "cmd",
      "cmd+shift",
      "cmd+alt",
      "cmd+alt+shift",
      "alt+caps",
    ];

    for (const layerName of layerNames) {
      const layerData = layersData[layerName];
      if (layerData && layerData[rowIndex]) {
        const char = layerData[rowIndex][keyIndex];
        if (char && char !== "") {
          layers[layerName] = char;
        }
      }
    }

    return {
      id: keyId,
      layers,
      width: 1.0,
    };
  });
}

/**
 * Creates a mobile keyboard key with appropriate properties.
 */
function createMobileKey(
  parsedKey: ParsedMobileKey,
  rowIndex: number,
  keyIndex: number,
  allLayers: { [layerName: string]: ParsedMobileKey[][] },
): Key {
  const keyId = `mobile-r${rowIndex}-k${keyIndex}`;

  // Build layers from all parsed layer data
  const layers: KeyLayers = {
    default: parsedKey.char,
  };

  // Map mobile layer names to our internal layer names
  const layerMap: Record<string, keyof KeyLayers> = {
    "shift": "shift",
    "alt": "alt",
    "alt+shift": "alt+shift",
    "symbols-1": "symbols-1" as keyof KeyLayers,
    "symbols-2": "symbols-2" as keyof KeyLayers,
  };

  for (const [layerName, internalName] of Object.entries(layerMap)) {
    const layerData = allLayers[layerName];
    if (layerData?.[rowIndex]?.[keyIndex]) {
      const char = layerData[rowIndex][keyIndex].char;
      if (char) {
        layers[internalName] = char;
      }
    }
  }

  // Handle special keys
  if (parsedKey.specialType) {
    const specialType = parsedKey.specialType;

    // Map mobile special keys to standard key properties
    const specialKeyMap: Record<string, Partial<Key>> = {
      "shift": {
        id: "ShiftLeft", // Use standard shift ID so it works with existing logic
        label: "⇧",
        layers: { default: "" },
        type: "modifier",
      },
      "backspace": {
        id: "Backspace",
        label: "⌫",
        layers: { default: "\b" },
        type: "modifier",
      },
      "return": {
        id: "Enter",
        label: "⏎",
        layers: { default: "\n" },
        type: "modifier",
      },
      "enter": {
        id: "Enter",
        label: "⏎",
        layers: { default: "\n" },
        type: "modifier",
      },
      "symbols": {
        id: "MobileSymbols",
        label: "123",
        layers: { default: "" },
        type: "modifier",
      },
      "space": {
        id: "Space",
        label: "",
        layers: { default: " " },
        type: "space",
      },
    };

    const specialKeyProps = specialKeyMap[specialType] || {
      id: keyId,
      label: specialType,
      layers: { default: "" },
      type: "modifier",
    };

    return {
      ...specialKeyProps,
      width: parsedKey.width || 1.0,
    } as Key;
  }

  // Regular character key
  return {
    id: keyId,
    layers,
    width: parsedKey.width || 1.0,
  };
}

/**
 * Transforms a mobile keyboard layout (iOS/Android) into our internal format.
 */
function transformMobileLayout(
  kbdgenData: KbdgenLayout,
  platform: Platform,
  variant: DeviceVariant,
  repoCode: string,
  layoutName: string,
): KeyboardLayout {
  // Extract layers and transforms for the mobile platform/variant
  const { layers, transforms } = extractPlatformData(
    kbdgenData,
    platform,
    variant,
  );

  // Parse all available layers with mobile parser
  const parsedLayers: { [layerName: string]: ParsedMobileKey[][] } = {};

  const layerNames = Object.keys(layers) as (keyof KbdgenLayers)[];
  for (const layerName of layerNames) {
    const layerString = layers[layerName];
    if (layerString) {
      parsedLayers[layerName] = parseMobileLayerString(layerString);
    }
  }

  // Convert transforms to deadkeys
  const deadkeys = transforms;

  // Build keyboard rows from the default layer
  const defaultLayer = parsedLayers.default;
  if (!defaultLayer) {
    throw new Error("No default layer found for mobile layout");
  }

  const rows = defaultLayer.map((rowKeys, rowIndex) => {
    const keys = rowKeys.map((parsedKey, keyIndex) =>
      createMobileKey(parsedKey, rowIndex, keyIndex, parsedLayers)
    );

    return { keys };
  });

  // Add synthetic bottom row with spacebar and return
  // This row is standard across all mobile keyboards but not defined in YAML
  // Only iOS keyboards have symbols layers, so only add the symbols key for iOS
  const bottomRowKeys: Key[] = [];

  if (platform === Platform.IOS) {
    bottomRowKeys.push({
      id: "MobileSymbols",
      label: "123",
      layers: { default: "" },
      type: "modifier" as const,
      width: 1.5,
    });
  }

  bottomRowKeys.push({
    id: "Space",
    label: "",
    layers: { default: " " },
    type: "space" as const,
    width: platform === Platform.IOS ? 8.0 : 9.5,
  });

  // iPad layouts have a second symbols key instead of Enter
  const isIPad = variant === DeviceVariant.IPad9in ||
    variant === DeviceVariant.IPad12in;
  if (isIPad) {
    bottomRowKeys.push({
      id: "MobileSymbols2",
      label: "123",
      layers: { default: "" },
      type: "modifier" as const,
      width: 1.5,
    });
  } else {
    bottomRowKeys.push({
      id: "Enter",
      label: "⏎",
      layers: { default: "\n" },
      type: "modifier" as const,
      width: 1.5,
    });
  }

  rows.push({
    keys: bottomRowKeys,
  });

  // Generate display name
  const displayName = kbdgenData.displayNames?.en ||
    kbdgenData.locale ||
    `${repoCode} - ${layoutName} (${platform} ${variant})`;

  return {
    id: `${repoCode}-${layoutName}-${platform}-${variant}`,
    name: displayName,
    deadkeys,
    rows,
    isMobile: true,
    platform,
    variant,
  };
}

/**
 * Transforms a kbdgen keyboard layout into our internal format.
 *
 * @param kbdgenData - The parsed kbdgen YAML layout data
 * @param platform - Platform to extract (e.g., "macOS", "windows", "iOS", "android")
 * @param repoCode - Language code (e.g., "sme" for Northern Sami)
 * @param layoutName - Layout variant name (e.g., "se-SE")
 * @param variant - Mobile variant (e.g., "primary", "iPad-9in") - only for mobile platforms
 * @returns A keyboard layout in our internal format
 */
export function transformKbdgenToLayout(
  kbdgenData: KbdgenLayout,
  platform: Platform,
  repoCode: string,
  layoutName: string,
  variant: DeviceVariant = DeviceVariant.Primary,
): KeyboardLayout {
  // Route to mobile transformer for iOS/Android
  if (isMobilePlatform(platform)) {
    return transformMobileLayout(
      kbdgenData,
      platform,
      variant,
      repoCode,
      layoutName,
    );
  }

  // Desktop platform transformation (existing logic)
  // Extract layers and transforms for the requested platform
  const { layers, transforms } = extractPlatformData(kbdgenData, platform);

  // Parse all available layers into 2D arrays
  const parsedLayers: { [layerName: string]: string[][] } = {};

  // Parse each layer that exists in the kbdgen data
  const layerNames = Object.keys(layers) as (keyof KbdgenLayers)[];
  for (const layerName of layerNames) {
    const layerString = layers[layerName];
    if (layerString) {
      parsedLayers[layerName] = parseLayerString(layerString);
    }
  }

  // Convert transforms to deadkeys (both are the same structure)
  const deadkeys = transforms;

  // Build the keyboard rows
  const rows = [];

  // Row 1: Number row + Backspace
  if (parsedLayers.default?.[0]) {
    rows.push({
      keys: [
        ...createKeyboardRow(ISO_KEY_POSITIONS.row1, parsedLayers, 0),
        SPECIAL_KEYS.backspace,
      ],
    });
  }

  // Row 2: Tab + QWERTY row + Enter
  if (parsedLayers.default?.[1]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.tab,
        ...createKeyboardRow(ISO_KEY_POSITIONS.row2, parsedLayers, 1),
        SPECIAL_KEYS.enter,
      ],
    });
  }

  // Row 3: CapsLock + ASDF row
  if (parsedLayers.default?.[2]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.capsLock,
        ...createKeyboardRow(ISO_KEY_POSITIONS.row3, parsedLayers, 2),
      ],
    });
  }

  // Row 4: ShiftLeft + ZXCV row + ShiftRight
  if (parsedLayers.default?.[3]) {
    rows.push({
      keys: [
        SPECIAL_KEYS.shiftLeft,
        ...createKeyboardRow(ISO_KEY_POSITIONS.row4, parsedLayers, 3),
        SPECIAL_KEYS.shiftRight,
      ],
    });
  }

  // Row 5: Bottom row (Cmd keys only on macOS)
  const bottomRowKeys = [SPECIAL_KEYS.controlLeft];
  bottomRowKeys.push(SPECIAL_KEYS.altLeft);

  if (platform === Platform.MacOS) {
    bottomRowKeys.push(SPECIAL_KEYS.metaLeft);
  }

  bottomRowKeys.push(SPECIAL_KEYS.space);

  if (platform === Platform.MacOS) {
    bottomRowKeys.push(SPECIAL_KEYS.metaRight);
  }

  bottomRowKeys.push(SPECIAL_KEYS.altRight);
  bottomRowKeys.push(SPECIAL_KEYS.controlRight);

  rows.push({
    keys: bottomRowKeys,
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
    platform,
  };
}

/**
 * Returns a list of supported platforms available in a kbdgen layout.
 * Only returns platforms supported by the viewer: macOS, Windows, and ChromeOS.
 *
 * @param kbdgenData - The parsed kbdgen YAML layout data
 * @returns Array of platform names (e.g., ["macOS", "windows", "chromeOS"])
 */
export function getAvailablePlatforms(kbdgenData: KbdgenLayout): Platform[] {
  const platforms: Platform[] = [];

  // Only include platforms supported by the viewer
  if (kbdgenData.macOS) platforms.push(Platform.MacOS);
  if (kbdgenData.windows) platforms.push(Platform.Windows);
  if (kbdgenData.chromeOS) platforms.push(Platform.ChromeOS);
  if (kbdgenData.android) platforms.push(Platform.Android);
  if (kbdgenData.iOS) platforms.push(Platform.IOS);

  return platforms;
}
