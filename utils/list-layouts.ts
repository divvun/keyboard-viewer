import { parse as parseYaml } from "jsr:@std/yaml@^1.0.0";
import type { KbdgenLayout } from "./kbdgen-transform.ts";

export interface LayoutFile {
  file: string;
  displayName: string;
}

interface CacheEntry {
  data: LayoutFile[];
  expiresAt: number;
}

const listCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function githubHeaders(): Record<string, string> {
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "keyboard-viewer",
  };
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }
  return headers;
}

async function fetchDisplayName(
  kbd: string,
  file: string,
): Promise<string> {
  const name = file.replace(/\.yaml$/, "");
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/giellalt/keyboard-${kbd}/refs/heads/main/${kbd}.kbdgen/layouts/${file}`,
      { headers: githubHeaders() },
    );
    if (!response.ok) return name;

    const rawYaml = await response.text();
    const kbdgenData = parseYaml(rawYaml) as KbdgenLayout;
    return kbdgenData.displayNames?.en || name;
  } catch {
    return name;
  }
}

/**
 * List the available kbdgen layout files for a keyboard repo, along with a
 * human-readable display name read from each file's `displayNames.en`.
 */
export async function listLayoutFiles(kbd: string): Promise<LayoutFile[]> {
  const cached = listCache.get(kbd);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(
    `https://api.github.com/repos/giellalt/keyboard-${kbd}/contents/${kbd}.kbdgen/layouts`,
    { headers: githubHeaders() },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Layouts directory not found");
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const contents = await response.json();

  const files = (contents as { name: string; type: string }[])
    .filter((entry) => entry.type === "file" && entry.name.endsWith(".yaml"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const result = await Promise.all(
    files.map(async (file) => ({
      file: file.replace(/\.yaml$/, ""),
      displayName: await fetchDisplayName(kbd, file),
    })),
  );

  listCache.set(kbd, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
