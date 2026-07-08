import { page } from "fresh";
import type { PageProps } from "fresh";
import { define, getErrorMessage } from "../utils.ts";
import { KeyboardEmbed } from "../islands/KeyboardEmbed.tsx";
import { StaticKeyboardEmbed } from "../components/StaticKeyboardEmbed.tsx";
import {
  type LayoutCombo,
  StaticKeyboardLayoutPicker,
} from "../components/StaticKeyboardLayoutPicker.tsx";
import {
  parseKeyboardParams,
  serializeKeyboardParams,
} from "../utils/keyboard-params.ts";
import { loadKeyboardLayout } from "../utils/load-layout.ts";
import { listLayoutFiles } from "../utils/list-layouts.ts";
import { enumerateLayers } from "../utils/layer-state.ts";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";

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
  error?: string;
  staticUrl: string;
  requestedWidth?: number;
}

/**
 * Picks the layout file that should be selected by default when the caller
 * didn't pin one: prefer the bare file with no region/script suffix (e.g.
 * "se" over "se-FI"), falling back to the first alphabetically when every
 * file has a suffix (e.g. smj, which only has smj-NO/smj-SE).
 */
function pickDefaultLayoutFile(files: { file: string }[]): string {
  const bare = files.find((f) => !f.file.includes("-"));
  return bare?.file ?? files[0].file;
}

export const handler = define.handlers<EmbedData>({
  async GET(ctx) {
    const params = parseKeyboardParams(ctx.url.searchParams);
    const interactive = ctx.url.searchParams.get("interactive") !== "false";
    // parseKeyboardParams defaults `layout` globally (to "se") when absent,
    // which is meaningless for kbds that don't have that file. Detect
    // absence from the raw query string instead of trusting params.layout.
    const hasExplicitLayout = ctx.url.searchParams.has("layout");

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

      if (!hasExplicitLayout) {
        // Picker mode: enumerate every layout file for this kbd and load
        // them all so the CSS-only layout tab bar has something to show.
        try {
          const files = await listLayoutFiles(params.kbd);
          if (files.length === 0) {
            throw new Error("No layouts found for this keyboard");
          }

          const loaded = await Promise.all(
            files.map(async (f) => ({
              file: f.file,
              displayName: f.displayName,
              loaded: await loadKeyboardLayout({ ...params, layout: f.file }),
            })),
          );

          // Some kbdgen repos declare a "bare" layout file for mobile only
          // (e.g. sme's se.yaml is android/iOS-only; the desktop layouts are
          // se-FI/se-NO/se-SE). loadKeyboardLayout silently substitutes a
          // different platform when the requested one isn't available for a
          // given file, which would make picker tabs show inconsistent
          // keyboard shapes. Only offer files that actually support the
          // pinned platform so every tab in one picker renders the same
          // platform.
          const combos: LayoutCombo[] = loaded
            .filter((c) => c.loaded.selectedPlatform === params.platform)
            .map((c) => ({
              file: c.file,
              displayName: c.displayName,
              layout: c.loaded.layout,
              layers: enumerateLayers(c.loaded.layout),
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
        } catch (e) {
          return page<EmbedData>({ ...base, error: getErrorMessage(e) });
        }
      }

      try {
        const loaded = await loadKeyboardLayout(params);
        const layers = enumerateLayers(loaded.layout);
        return page<EmbedData>(
          { ...base, keyboardLayout: loaded.layout, layers },
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
