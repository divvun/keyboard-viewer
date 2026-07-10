import { Fragment } from "preact";
import { page } from "fresh";
import type { PageProps, RouteConfig } from "fresh";
import { define, getErrorMessage } from "../utils.ts";
import KeyboardIsland from "../islands/Keyboard.tsx";
import {
  computeLayoutPickerHeightPx,
  computePlatformPickerHeightPx,
  computeStaticEmbedHeightPx,
  enumerateLayers,
  type KeyboardLayout,
  type KeyboardParams,
  type LayerState,
  type LayoutCombo,
  listLayoutFiles,
  loadKeyboardLayout,
  type Platform,
  type PlatformCombo,
  StaticKeyboardEmbed,
  StaticKeyboardLayoutPicker,
  StaticKeyboardPlatformPicker,
} from "@divvun/keyboard";
import {
  parseKeyboardParams,
  serializeKeyboardParams,
} from "../utils/keyboard-params.ts";

// The embed page renders a complete document for iframing — never wrap it
// in the app shell (that used to nest a full <html> inside _app's <body>).
export const config: RouteConfig = {
  skipAppWrapper: true,
};

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

// Progressive enhancement for the no-JS static embed: without this, the
// keyboard is a fixed size baked in at request time via `?width=`, so it
// gets clipped on viewports narrower than that. With JS, re-fit every
// ScaledEmbed block (marked by data-natural-width/height — see
// @divvun/keyboard's StaticKeyboardEmbed) to the iframe's *actual* rendered
// width on load/resize, then report the real height to the parent page via
// the same `giellalt-keyboard-resize` postMessage the interactive embed
// already sends, so existing listener scripts on embedding sites work
// unchanged.
//
// Uses ResizeObserver, not a `resize` listener: iframes don't reliably fire
// `resize` when their size changes via CSS (e.g. width:100% reacting to the
// parent window resizing) — a well-known cross-browser gotcha, and the
// reason useKeyboardScaling.ts uses ResizeObserver too.
const RESIZE_SCRIPT = `(function () {
  function remToPx(rem) {
    var base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * base;
  }

  function rescaleAll() {
    var available = document.documentElement.clientWidth;
    var els = document.querySelectorAll("[data-natural-width]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var naturalWidth = parseFloat(el.getAttribute("data-natural-width"));
      var naturalHeight = parseFloat(el.getAttribute("data-natural-height"));
      var scale = Math.min(available / remToPx(naturalWidth), 1);
      scale = Math.max(scale, 0.2);
      var inner = el.firstElementChild;
      if (inner) inner.style.transform = "scale(" + scale + ")";
      el.style.width = (naturalWidth * scale) + "rem";
      el.style.height = (naturalHeight * scale) + "rem";
    }
  }

  function measureAndPost() {
    var height = document.documentElement.scrollHeight;
    window.parent.postMessage({ type: "giellalt-keyboard-resize", height: height }, "*");
  }

  function rescaleAndPost() {
    rescaleAll();
    requestAnimationFrame(measureAndPost);
  }

  var resizeTimer;
  function scheduleRescale() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rescaleAndPost, 100);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(scheduleRescale).observe(document.documentElement);
  } else {
    window.addEventListener("resize", scheduleRescale);
  }

  document.addEventListener("change", function (event) {
    if (event.target && event.target.type === "radio") {
      requestAnimationFrame(measureAndPost);
    }
  });

  rescaleAndPost();
})();`;

// Height reporting for the hydrated island embed. The island re-fits its
// keyboard to the iframe width itself (ResizeObserver in
// @divvun/keyboard's <Keyboard>), so unlike RESIZE_SCRIPT this only
// measures and posts — same `giellalt-keyboard-resize` contract legacy
// listener scripts already understand.
const POST_HEIGHT_SCRIPT = `(function () {
  function post() {
    window.parent.postMessage({
      type: "giellalt-keyboard-resize",
      height: document.documentElement.scrollHeight,
    }, "*");
  }
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
  else window.addEventListener("resize", post);
  post();
})();`;

/**
 * Loads every platform a single layout file declares, so a platform tab bar
 * has something to show. `loadKeyboardLayout` caches the underlying kbdgen
 * fetch+parse per (kbd, layout) — see the package's `fetch-kbdgen.ts` — so
 * this only costs one GitHub fetch regardless of how many platforms it
 * materializes.
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

    const cacheHeaders = {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    };

    if (!interactive) {
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

    // Interactive: same server-side load as the static path — the island
    // receives the transformed layout as props and never fetches.
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
  },
});

export default function EmbedPage({ data }: PageProps<EmbedData>) {
  const {
    kbd,
    layout,
    platform,
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
  // Total rendered height (tab bars + scaled grid) for whichever combination
  // of pickers is about to render — read this off <body> below. Only set for
  // the no-JS static paths; the interactive island reports its height via
  // postMessage instead (see POST_HEIGHT_SCRIPT).
  let embedHeight: number | undefined;
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
  } else if (!interactive) {
    if (combos) {
      embedHeight = computeLayoutPickerHeightPx(
        combos,
        layout,
        platform as Platform,
        requestedWidth,
      );
      body = (
        <Fragment>
          <StaticKeyboardLayoutPicker
            kbd={kbd}
            combos={combos}
            initialFile={layout}
            initialPlatform={platform as Platform}
            initialLayer={layer}
            requestedWidth={requestedWidth}
          />
          <script
            // deno-lint-ignore react-no-danger
            dangerouslySetInnerHTML={{ __html: RESIZE_SCRIPT }}
          />
        </Fragment>
      );
    } else if (platformCombos) {
      embedHeight = computePlatformPickerHeightPx(
        platformCombos,
        platform as Platform,
        requestedWidth,
      );
      body = (
        <Fragment>
          <StaticKeyboardPlatformPicker
            uidPrefix={`${kbd}-${layout}`}
            combos={platformCombos}
            initialPlatform={platform as Platform}
            initialLayer={layer}
            requestedWidth={requestedWidth}
          />
          <script
            // deno-lint-ignore react-no-danger
            dangerouslySetInnerHTML={{ __html: RESIZE_SCRIPT }}
          />
        </Fragment>
      );
    } else {
      embedHeight = computeStaticEmbedHeightPx(keyboardLayout!, requestedWidth);
      body = (
        <Fragment>
          <StaticKeyboardEmbed
            layout={keyboardLayout!}
            layers={layers!}
            initialLayer={layer}
            requestedWidth={requestedWidth}
          />
          <script
            // deno-lint-ignore react-no-danger
            dangerouslySetInnerHTML={{ __html: RESIZE_SCRIPT }}
          />
        </Fragment>
      );
    }
  } else {
    // The island's server render is already a fully working no-JS keyboard
    // (radio/:checked machinery), so there is no <noscript> fallback — the
    // fallback IS the page. Hydration adds the test text area and typing.
    body = (
      <Fragment>
        <KeyboardIsland
          layout={keyboardLayout!}
          layers={layers!}
          initialLayer={layer}
          requestedWidth={requestedWidth}
        />
        <script
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{ __html: POST_HEIGHT_SCRIPT }}
        />
      </Fragment>
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
      <body data-embed-height={embedHeight}>
        {body}
      </body>
    </html>
  );
}
