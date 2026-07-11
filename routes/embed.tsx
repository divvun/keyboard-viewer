import { Fragment } from "preact";
import { page } from "fresh";
import type { PageProps, RouteConfig } from "fresh";
import { define, getErrorMessage } from "../utils.ts";
import KeyboardIsland from "../islands/Keyboard.tsx";
import {
  buildKeyboardComboTree,
  computeLayoutPickerHeightPx,
  type DeviceVariant,
  enumerateLayers,
  type KeyboardLayout,
  type LayerState,
  type LayoutCombo,
  loadKeyboardLayout,
  type Platform,
  StaticKeyboardLayoutPicker,
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
  error?: string;
  staticUrl: string;
  requestedWidth?: number;
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
    const hasExplicitVariant = ctx.url.searchParams.has("variant");

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
        const tree = await buildKeyboardComboTree(params, {
          layoutFile: hasExplicitLayout ? params.layout : undefined,
          platform: hasExplicitPlatform ? params.platform : undefined,
          variant: hasExplicitVariant ? params.variant : undefined,
        });
        return page<EmbedData>(
          {
            ...base,
            layout: tree.defaultFile,
            platform: tree.defaultPlatform,
            variant: tree.defaultVariant,
            combos: tree.combos,
          },
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
// parent window resizing) — a well-known cross-browser gotcha, and the same
// reason KeyboardPicker's own resize-refit effect uses ResizeObserver too.
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
  // Total rendered height (tab bars + scaled grid) for the no-JS static
  // path — read this off <body> below. The interactive island reports its
  // height via postMessage instead (see POST_HEIGHT_SCRIPT).
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
    embedHeight = computeLayoutPickerHeightPx(
      combos!,
      layout,
      platform as Platform,
      variant as DeviceVariant,
      requestedWidth,
    );
    body = (
      <Fragment>
        <StaticKeyboardLayoutPicker
          kbd={kbd}
          combos={combos!}
          initialFile={layout}
          initialPlatform={platform as Platform}
          initialVariant={variant as DeviceVariant}
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
