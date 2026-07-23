import { fetchKbdgenData } from "./fetch-kbdgen.ts";
import { githubApiHeaders } from "./github.ts";

export interface LayoutFile {
  file: string;
  displayName: string;
}

interface FileListCacheEntry {
  /** Layout file names, without the .yaml extension. Language-independent —
   * kept separate from display-name resolution below so that requesting a
   * different `preferredLangs` never re-hits the (rate-limited) GitHub
   * directory-listing API, only the already-cached kbdgen YAML lookups. */
  files: string[];
  expiresAt: number;
}

const fileListCache = new Map<string, FileListCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Picks the best available display name: the first `preferredLangs` entry
 * present in `displayNames`, falling back to English, then undefined
 * (callers fall back further to the layout file name itself). */
export function pickDisplayName(
  displayNames: Record<string, string> | undefined,
  preferredLangs: string[],
): string | undefined {
  if (!displayNames) return undefined;
  for (const lang of preferredLangs) {
    if (displayNames[lang]) return displayNames[lang];
  }
  return displayNames.en;
}

/**
 * Sorts raw ".yaml" directory-listing entry names and strips the extension —
 * in that order. localeCompare's collation weighs punctuation enough that
 * comparing "se" vs "se-FI" sorts the bare file first, while comparing
 * "se.yaml" vs "se-FI.yaml" sorts it last; the kbdgen convention (bare files
 * are mobile-only, not representative — see `pickDefaultLayoutFile`) relies
 * on sorting with the extension still attached.
 */
export function sortLayoutFileNames(entryNames: string[]): string[] {
  return [...entryNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => name.replace(/\.yaml$/, ""));
}

/**
 * Resolves a single layout file's display name the same way `listLayoutFiles`
 * does for every file in a repo — exported so callers that already have one
 * specific `layoutFile` pinned (e.g. `buildKeyboardComboTree`'s layout-pinned
 * path) can resolve its real display name instead of falling back to the raw
 * filename.
 */
export async function fetchDisplayName(
  kbd: string,
  layoutFile: string,
  preferredLangs: string[] = ["en"],
): Promise<string> {
  try {
    const { kbdgenData } = await fetchKbdgenData(kbd, layoutFile);
    return pickDisplayName(kbdgenData.displayNames, preferredLangs) ??
      layoutFile;
  } catch {
    return layoutFile;
  }
}

async function listLayoutFileNames(kbd: string): Promise<string[]> {
  const cached = fileListCache.get(kbd);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.files;
  }

  const response = await fetch(
    `https://api.github.com/repos/giellalt/keyboard-${kbd}/contents/${kbd}.kbdgen/layouts`,
    { headers: githubApiHeaders() },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Layouts directory not found");
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const contents = await response.json();

  const files = sortLayoutFileNames(
    (contents as { name: string; type: string }[])
      .filter((entry) => entry.type === "file" && entry.name.endsWith(".yaml"))
      .map((entry) => entry.name),
  );

  fileListCache.set(kbd, { files, expiresAt: Date.now() + CACHE_TTL_MS });
  return files;
}

/**
 * List the available kbdgen layout files for a keyboard repo, along with a
 * human-readable display name for each — the first of `preferredLangs`
 * (e.g. a site's current UI language plus its own fallback chain) present in
 * the layout file's `displayNames`, falling back to English, then the file
 * name itself. Defaults to English-only when `preferredLangs` is omitted.
 */
export async function listLayoutFiles(
  kbd: string,
  preferredLangs: string[] = ["en"],
): Promise<LayoutFile[]> {
  const files = await listLayoutFileNames(kbd);
  return Promise.all(
    files.map(async (layoutFile) => ({
      file: layoutFile,
      displayName: await fetchDisplayName(kbd, layoutFile, preferredLangs),
    })),
  );
}
