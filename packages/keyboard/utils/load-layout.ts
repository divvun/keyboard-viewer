import {
  getAvailablePlatforms,
  getMobileVariants,
  NoPlatformsInLayoutError,
  transformKbdgenToLayout,
} from "./kbdgen-transform.ts";
import {
  DEFAULT_VARIANT,
  type DeviceVariant,
  type Platform,
} from "../constants/platforms.ts";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { KeyboardParams } from "./params.ts";
import { fetchKbdgenData, LayoutNotFoundError } from "./fetch-kbdgen.ts";

export { LayoutNotFoundError };

export interface LoadedKeyboard {
  layout: KeyboardLayout;
  availablePlatforms: Platform[];
  availableVariants: DeviceVariant[];
  selectedPlatform: Platform;
  selectedVariant: DeviceVariant;
  rawYaml: string;
}

export async function loadKeyboardLayout(
  params: KeyboardParams,
): Promise<LoadedKeyboard> {
  const { kbdgenData, rawYaml } = await fetchKbdgenData(
    params.kbd,
    params.layout,
  );

  const availablePlatforms = getAvailablePlatforms(kbdgenData);
  if (availablePlatforms.length === 0) {
    throw new NoPlatformsInLayoutError();
  }

  const selectedPlatform = availablePlatforms.includes(params.platform)
    ? params.platform
    : availablePlatforms[0];

  const availableVariants = getMobileVariants(kbdgenData, selectedPlatform);
  const selectedVariant = availableVariants.includes(params.variant)
    ? params.variant
    : (availableVariants[0] || DEFAULT_VARIANT);

  const layout = transformKbdgenToLayout(
    kbdgenData,
    selectedPlatform,
    params.kbd,
    params.layout,
    selectedVariant,
  );

  return {
    layout,
    availablePlatforms,
    availableVariants,
    selectedPlatform,
    selectedVariant,
    rawYaml,
  };
}
