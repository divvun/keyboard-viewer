import { parse as parseYaml } from "jsr:@std/yaml@^1.0.0";
import type { KbdgenLayout } from "./kbdgen-transform.ts";

export class LayoutNotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Layout file not found");
    this.name = "LayoutNotFoundError";
  }
}

export interface KbdgenFetchResult {
  kbdgenData: KbdgenLayout;
  rawYaml: string;
}

interface CacheEntry {
  data: KbdgenFetchResult;
  expiresAt: number;
}

const kbdgenCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 200;

/**
 * Fetches and parses the kbdgen YAML for a single layout file, cached by
 * (kbd, layoutFile) only — independent of platform/variant, since the raw
 * file content is the same regardless of which platform a caller wants to
 * render. Shared by `load-layout.ts` (platform-specific transform) and
 * `list-layouts.ts` (display names), so materializing multiple platforms or
 * looking up a display name for the same file never re-fetches from GitHub.
 */
export async function fetchKbdgenData(
  kbd: string,
  layoutFile: string,
): Promise<KbdgenFetchResult> {
  const cacheKey = `${kbd}/${layoutFile}`;

  const cached = kbdgenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const headers: Record<string, string> = { "User-Agent": "keyboard-viewer" };
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  const response = await fetch(
    `https://raw.githubusercontent.com/giellalt/keyboard-${kbd}/refs/heads/main/${kbd}.kbdgen/layouts/${layoutFile}.yaml`,
    { headers },
  );

  if (!response.ok) {
    if (response.status === 404) throw new LayoutNotFoundError();
    throw new Error(`GitHub fetch error: ${response.statusText}`);
  }

  const rawYaml = await response.text();
  const kbdgenData = parseYaml(rawYaml) as KbdgenLayout;

  const result: KbdgenFetchResult = { kbdgenData, rawYaml };

  if (kbdgenCache.size >= CACHE_MAX_SIZE) {
    kbdgenCache.delete(kbdgenCache.keys().next().value!);
  }
  kbdgenCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}
