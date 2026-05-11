import { page } from "fresh";
import type { PageProps } from "fresh";
import { define, getErrorMessage } from "../utils.ts";
import { KeyboardEmbed } from "../islands/KeyboardEmbed.tsx";
import { StaticKeyboardEmbed } from "../components/StaticKeyboardEmbed.tsx";
import {
  parseKeyboardParams,
  serializeKeyboardParams,
} from "../utils/keyboard-params.ts";
import { loadKeyboardLayout } from "../utils/load-layout.ts";
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
  error?: string;
  staticUrl: string;
}

export const handler = define.handlers<EmbedData>({
  async GET(ctx) {
    const params = parseKeyboardParams(ctx.url.searchParams);
    const interactive = ctx.url.searchParams.get("interactive") !== "false";

    const staticUrl = `/embed?${serializeKeyboardParams(params)}&interactive=false`;

    const base = {
      kbd: params.kbd,
      layout: params.layout,
      platform: params.platform as string,
      variant: params.variant as string,
      layer: params.layer ?? "default",
      interactive,
      staticUrl,
    };

    if (!interactive) {
      try {
        const loaded = await loadKeyboardLayout(params);
        const layers = enumerateLayers(loaded.layout);
        return page<EmbedData>(
          { ...base, keyboardLayout: loaded.layout, layers },
          { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
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
    error,
    staticUrl,
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
          <a
            href={`/embed?kbd=${kbd}&layout=${layout}&platform=${platform}&variant=${variant}`}
          >
            Try again
          </a>
        </div>
      );
    } else {
      body = (
        <StaticKeyboardEmbed
          layout={keyboardLayout!}
          layers={layers!}
          initialLayer={layer}
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
