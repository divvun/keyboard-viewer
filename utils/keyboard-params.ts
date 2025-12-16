import {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  type DeviceVariant,
  type Platform,
} from "../constants/platforms.ts";

// Shared parameter types
export interface KeyboardParams {
  kbd: string;
  layout: string;
  platform: Platform;
  variant: DeviceVariant;
}

// Default keyboard repo and layout
// (Platform and variant defaults come from constants/platforms.ts)
const DEFAULT_KBD = "sme";
const DEFAULT_LAYOUT = "se";

// Parse URL params (works both server and client side)
export function parseKeyboardParams(
  searchParams: URLSearchParams,
): KeyboardParams {
  return {
    kbd: searchParams.get("kbd") || DEFAULT_KBD,
    layout: searchParams.get("layout") || DEFAULT_LAYOUT,
    platform: (searchParams.get("platform") as Platform) || DEFAULT_PLATFORM,
    variant: (searchParams.get("variant") as DeviceVariant) || DEFAULT_VARIANT,
  };
}

// Build API URL for fetching keyboard
export function buildKeyboardApiUrl(params: KeyboardParams): string {
  return `/api/github/layout?repo=${params.kbd}&file=${params.layout}.yaml&platform=${params.platform}&variant=${params.variant}`;
}

// Serialize params back to URL string (for viewer)
export function serializeKeyboardParams(
  params: Partial<KeyboardParams>,
): string {
  const urlParams = new URLSearchParams();
  if (params.kbd) urlParams.set("kbd", params.kbd);
  if (params.layout) urlParams.set("layout", params.layout);
  if (params.platform) urlParams.set("platform", params.platform);
  if (params.variant) urlParams.set("variant", params.variant);
  return urlParams.toString();
}
