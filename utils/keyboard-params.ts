import {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  type DeviceVariant,
  type Platform,
} from "@divvun/keyboard";

// Shared parameter types
export interface KeyboardParams {
  kbd: string;
  layout: string;
  platform: Platform;
  variant: DeviceVariant;
  layer?: string;
}

// Default keyboard repo and layout
// (Platform and variant defaults come from constants/platforms.ts)
const DEFAULT_KBD = "sme";
const DEFAULT_LAYOUT = "se";

// Parse URL params (works both server and client side)
export function parseKeyboardParams(
  searchParams: URLSearchParams,
): KeyboardParams {
  const layer = searchParams.get("layer") || undefined;
  return {
    kbd: searchParams.get("kbd") || DEFAULT_KBD,
    layout: searchParams.get("layout") || DEFAULT_LAYOUT,
    platform: (searchParams.get("platform") as Platform) || DEFAULT_PLATFORM,
    variant: (searchParams.get("variant") as DeviceVariant) || DEFAULT_VARIANT,
    layer,
  };
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
  if (params.layer) urlParams.set("layer", params.layer);
  return urlParams.toString();
}
