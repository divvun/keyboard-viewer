import { page } from "fresh";
import type { PageProps } from "fresh";
import { define, getErrorMessage } from "../utils.ts";
import { KeyboardEmbed } from "../islands/KeyboardEmbed.tsx";
import { StaticKeyboardEmbed } from "../components/StaticKeyboardEmbed.tsx";
import {
  type LayoutCombo,
  type PlatformCombo,
  StaticKeyboardLayoutPicker,
} from "../components/StaticKeyboardLayoutPicker.tsx";
import { StaticKeyboardPlatformPicker } from "../components/StaticKeyboardPlatformPicker.tsx";
import {
  parseKeyboardParams,
  serializeKeyboardParams,
} from "../utils/keyboard-params.ts";
import { loadKeyboardLayout } from "../utils/load-layout.ts";
import { listLayoutFiles } from "../utils/list-layouts.ts";
import { enumerateLayers } from "../utils/layer-state.ts";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import type { KeyboardParams } from "../utils/keyboard-params.ts";
import type { Platform } from "../constants/platforms.ts";

interface EmbedData {
  kbd: string;
  layout: string;
  platform: string;
  variant: string;
  layer: string;
  interactive: boolean;
  keyboardLayout?: KeyboardLayout;
  layers?: LayerState[];
  combos?: LayoutCombo[];
  platformCombos?: PlatformCombo[];
  error?: string;
  staticUrl: string;
  requestedWidth?: number;
}

/**
 * Picks the layout file that should be selected by default when the caller
 * didn't pin one: just the first alphabetically (per `listLayoutFiles`'s
 * sort). A repo's "bare" file (e.g. sme's se.yaml) is often mobile-only —
 * preferring it isn't a representative default, so we don't special-case it.
 */
function pickDefaultLayoutFile(files: { file: string }[]): string {
  return files[0].file;
}

/**
 * Loads every platform a single layout file declares, so a platform tab bar
 * has something to show. `loadKeyboardLayout` caches the underlying kbdgen
 * fetch+parse per (kbd, layout) — see `utils/fetch-kbdgen.ts` — so this only
 * costs one GitHub fetch regardless of how many platforms it materializes.
 */
async function buildPlatformCombosForLayout(
  params: KeyboardParams,
  layoutFile: string,
): Promise<PlatformCombo[]> {
  const probe = await loadKeyboardLayout({ ...params, layout: layoutFile });

  return Promise.all(
    probe.availablePlatforms.map(async (platform) => {
      const loaded = platform === probe.selectedPlatform
        ? probe
        : await loadKeyboardLayout({
          ...params,
          layout: layoutFile,
          platform,
        });
      return {
        platform,
        layout: loaded.layout,
        layers: enumerateLayers(loaded.layout),
      };
    }),
  );
}

export const handler = define.handlers<EmbedData>({
  async GET(ctx) {
    const params = parseKeyboardParams(ctx.url.searchParams);
    const interactive = ctx.url.searchParams.get("interactive") !== "false";
    // parseKeyboardParams defaults `layout`/`platform` globally when absent,
    // which is meaningless for kbds that don't have that file/platform.
    // Detect absence from the raw query string instead of trusting params.
    const hasExplicitLayout = ctx.url.searchParams.has("layout");
    const hasExplicitPlatform = ctx.url.searchParams.has("platform");

    const staticUrl = `/embed?${
      serializeKeyboardParams(params)
    }&interactive=false`;

    const parsePositivePx = (raw: string | null): number | undefined => {
      if (raw == null) return undefined;
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const requestedWidth = parsePositivePx(ctx.url.searchParams.get("width"));

    const base = {
      kbd: params.kbd,
      layout: params.layout,
      platform: params.platform as string,
      variant: params.variant as string,
      layer: params.layer ?? "default",
      interactive,
      staticUrl,
      requestedWidth,
    };

    if (!interactive) {
      const cacheHeaders = {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      };

      try {
        if (hasExplicitLayout && hasExplicitPlatform) {
          // Both pinned — existing fast path, unchanged.
          const loaded = await loadKeyboardLayout(params);
          const layers = enumerateLayers(loaded.layout);
          return page<EmbedData>(
            { ...base, keyboardLayout: loaded.layout, layers },
            { headers: cacheHeaders },
          );
        }

        if (hasExplicitLayout && !hasExplicitPlatform) {
          // Layout pinned, platform absent: platform tabs for this one layout.
          const platformCombos = await buildPlatformCombosForLayout(
            params,
            params.layout,
          );
          const initialPlatform = platformCombos.some((c) =>
              c.platform === params.platform
            )
            ? params.platform
            : platformCombos[0].platform;

          return page<EmbedData>(
            { ...base, platform: initialPlatform, platformCombos },
            { headers: cacheHeaders },
          );
        }

        // Layout absent: enumerate every layout file for this kbd.
        const files = await listLayoutFiles(params.kbd);
        if (files.length === 0) {
          throw new Error("No layouts found for this keyboard");
        }

        if (!hasExplicitLayout && hasExplicitPlatform) {
          // Layout absent, platform pinned: existing behavior. Some kbdgen
          // repos declare a "bare" layout file for mobile only (e.g. sme's
          // se.yaml is android/iOS-only; the desktop layouts are
          // se-FI/se-NO/se-SE) — only offer files that actually support the
          // pinned platform so every layout tab renders the same platform.
          const loaded = await Promise.all(
            files.map(async (f) => ({
              file: f.file,
              displayName: f.displayName,
              loaded: await loadKeyboardLayout({ ...params, layout: f.file }),
            })),
          );

          const combos: LayoutCombo[] = loaded
            .filter((c) => c.loaded.selectedPlatform === params.platform)
            .map((c) => ({
              file: c.file,
              displayName: c.displayName,
              platformCombos: [{
                platform: c.loaded.selectedPlatform,
                layout: c.loaded.layout,
                layers: enumerateLayers(c.loaded.layout),
              }],
            }));

          if (combos.length === 0) {
            throw new Error(
              `No layouts available for platform ${params.platform}`,
            );
          }

          const defaultFile = pickDefaultLayoutFile(combos);

          return page<EmbedData>(
            { ...base, layout: defaultFile, combos },
            { headers: cacheHeaders },
          );
        }

        // Both absent: full nested layout → platform tree. Each layout's
        // platform set stands on its own — no cross-layout filtering, since
        // switching layout tabs doesn't need to keep a single platform
        // consistent across all of them anymore.
        const combos: LayoutCombo[] = await Promise.all(
          files.map(async (f) => ({
            file: f.file,
            displayName: f.displayName,
            platformCombos: await buildPlatformCombosForLayout(
              params,
              f.file,
            ),
          })),
        );

        const defaultFile = pickDefaultLayoutFile(files);

        return page<EmbedData>(
          { ...base, layout: defaultFile, combos },
          { headers: cacheHeaders },
        );
      } catch (e) {
        return page<EmbedData>({ ...base, error: getErrorMessage(e) });
      }
    }

    return page<EmbedData>(base);
  },
});

export default function EmbedPage({ data }: PageProps<EmbedData>) {
  const {
    kbd,
    layout,
    platform,
    variant,
    layer,
    interactive,
    keyboardLayout,
    layers,
    combos,
    platformCombos,
    error,
    staticUrl,
    requestedWidth,
  } = data;

  let body;
  if (!interactive) {
    if (error) {
      body = (
        <div
          style={{
            padding: "1rem",
            color: "#b91c1c",
            fontFamily: "sans-serif",
          }}
        >
          <p>Error loading keyboard: {error}</p>
          <a href={staticUrl}>Try again</a>
        </div>
      );
    } else if (combos) {
      body = (
        <StaticKeyboardLayoutPicker
          kbd={kbd}
          combos={combos}
          initialFile={layout}
          initialPlatform={platform as Platform}
          initialLayer={layer}
          requestedWidth={requestedWidth}
        />
      );
    } else if (platformCombos) {
      body = (
        <StaticKeyboardPlatformPicker
          uidPrefix={`${kbd}-${layout}`}
          combos={platformCombos}
          initialPlatform={platform as Platform}
          initialLayer={layer}
          requestedWidth={requestedWidth}
        />
      );
    } else {
      body = (
        <StaticKeyboardEmbed
          layout={keyboardLayout!}
          layers={layers!}
          initialLayer={layer}
          requestedWidth={requestedWidth}
        />
      );
    }
  } else {
    body = (
      <>
        <KeyboardEmbed
          kbd={kbd}
          layout={layout}
          platform={platform}
          variant={variant}
        />
        <noscript>
          <div
            style={{
              padding: "0.5rem",
              fontFamily: "sans-serif",
              fontSize: "0.875rem",
            }}
          >
            <a href={staticUrl}>View keyboard without JavaScript</a>
          </div>
        </noscript>
      </>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Keyboard: {kbd} - {layout}</title>
        <style>
          {`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: transparent;
          }
        `}
        </style>
      </head>
      <body>
        {body}
      </body>
    </html>
  );
}
