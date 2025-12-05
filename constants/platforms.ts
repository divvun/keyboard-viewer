/**
 * Supported keyboard platforms
 */
export enum Platform {
  MacOS = "macOS",
  Windows = "windows",
  ChromeOS = "chromeOS",
  IOS = "iOS",
  Android = "android",
}

/**
 * Device form factor variants for mobile platforms
 */
export enum DeviceVariant {
  Primary = "primary", // Phone/default
  IPad9in = "iPad-9in", // iPad 9 inch
  IPad12in = "iPad-12in", // iPad 12 inch
  Tablet600 = "tablet-600", // Android tablet 7-10 inch
}

/**
 * Display names for device variants
 */
export const VariantDisplayNames: Record<DeviceVariant, string> = {
  [DeviceVariant.Primary]: "Phone (default)",
  [DeviceVariant.IPad9in]: "iPad (9 inch)",
  [DeviceVariant.IPad12in]: "iPad (12 inch)",
  [DeviceVariant.Tablet600]: "Tablet (7-10 inch)",
};

/**
 * Default values for platform selection
 */
export const DEFAULT_PLATFORM = Platform.MacOS;
export const DEFAULT_VARIANT = DeviceVariant.Primary;

/**
 * Platforms that support device variants (mobile platforms)
 */
export const MOBILE_PLATFORMS = [Platform.IOS, Platform.Android] as const;

/**
 * Check if a platform supports device variants
 */
export function isMobilePlatform(platform: Platform): platform is Platform.IOS | Platform.Android {
  return MOBILE_PLATFORMS.includes(platform as any);
}
