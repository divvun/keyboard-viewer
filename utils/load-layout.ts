import { parse as parseYaml } from "jsr:@std/yaml";
import {
  getAvailablePlatforms,
  getMobileVariants,
  type KbdgenLayout,
  transformKbdgenToLayout,
} from "./kbdgen-transform.ts";
import {
  DEFAULT_VARIANT,
  type DeviceVariant,
  type Platform,
} from "../constants/platforms.ts";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { KeyboardParams } from "./keyboard-params.ts";

export class LayoutNotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Layout file not found");
    this.name = "LayoutNotFoundError";
  }
}

export interface LoadedKeyboard {
  layout: KeyboardLayout;
  availablePlatforms: Platform[];
  availableVariants: DeviceVariant[];
  selectedPlatform: Platform;
  selectedVariant: DeviceVariant;
  rawYaml: string;
}

interface CacheEntry {
  data: LoadedKeyboard;
  expiresAt: number;
}

const layoutCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 200;

export async function loadKeyboardLayout(
  params: KeyboardParams,
): Promise<LoadedKeyboard> {
  const cacheKey =
    `${params.kbd}/${params.layout}/${params.platform}/${params.variant}`;

  const cached = layoutCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const headers: Record<string, string> = { "User-Agent": "keyboard-viewer" };
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const layoutFile = `${params.layout}.yaml`;
  const response = await fetch(
    `https://raw.githubusercontent.com/giellalt/keyboard-${params.kbd}/refs/heads/main/${params.kbd}.kbdgen/layouts/${layoutFile}`,
    { headers },
  );

  if (!response.ok) {
    if (response.status === 404) throw new LayoutNotFoundError();
    throw new Error(`GitHub fetch error: ${response.statusText}`);
  }

  const rawYaml = await response.text();
  const kbdgenData = parseYaml(rawYaml) as KbdgenLayout;

  const availablePlatforms = getAvailablePlatforms(kbdgenData);
  if (availablePlatforms.length === 0) {
    throw new Error("No platforms found in layout file");
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

  const result: LoadedKeyboard = {
    layout,
    availablePlatforms,
    availableVariants,
    selectedPlatform,
    selectedVariant,
    rawYaml,
  };

  if (layoutCache.size >= CACHE_MAX_SIZE) {
    layoutCache.delete(layoutCache.keys().next().value!);
  }
  layoutCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
