export enum Platform {
  MacOS = "macOS",
  Windows = "windows",
  ChromeOS = "chromeOS",
  IOS = "iOS",
  Android = "android",
}

export enum DeviceVariant {
  Primary = "primary",
  IPad9in = "iPad-9in",
  IPad12in = "iPad-12in",
  Tablet600 = "tablet-600",
}

export const VariantDisplayNames: Record<DeviceVariant, string> = {
  [DeviceVariant.Primary]: "Phone (default)",
  [DeviceVariant.IPad9in]: "iPad (9 inch)",
  [DeviceVariant.IPad12in]: "iPad (12 inch)",
  [DeviceVariant.Tablet600]: "Tablet (7-10 inch)",
};

export const DEFAULT_PLATFORM = Platform.MacOS;
export const DEFAULT_VARIANT = DeviceVariant.Primary;
