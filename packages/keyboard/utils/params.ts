import type { DeviceVariant, Platform } from "../constants/platforms.ts";

/** Identifies one renderable keyboard: repo, layout file, platform, variant. */
export interface KeyboardParams {
  kbd: string;
  layout: string;
  platform: Platform;
  variant: DeviceVariant;
  layer?: string;
}
