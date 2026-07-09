import type { ComponentChildren } from "preact";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { layerNameToId } from "../utils/layer-state.ts";
import { KeyboardDisplay } from "./KeyboardDisplay.tsx";

const BASE_WIDTH = 3.5; // rem — matches Key component
const GAP = 0.25; // rem — matches KeyboardLayout row gap
const KBD_PADDING = 1; // rem — p-4 on each side
export const REM_TO_PX = 16;

// Tab bar sizing — shared across the layer, platform, and layout tab bars so
// they always look identical. Deliberately NOT scaled along with the
// keyboard (see ScaledEmbed below): tab bars are UI chrome and should stay
// legible/tappable regardless of how much the keyboard itself has to shrink
// to fit a requested width.
export const TAB_FONT_SIZE = 0.875; // rem — fontSize on <label>
const TAB_LINE_HEIGHT = 1.2; // unitless — browser "normal" approximation
export const TAB_LABEL_PAD_Y = 0.25; // rem — padding top/bottom on <label>
export const TAB_LABEL_PAD_X = 0.75; // rem — padding left/right on <label>
export const TAB_CONTAINER_PAD = 0.5; // rem — padding on tab bar container
const TAB_BORDER = 1 / REM_TO_PX; // rem — 1px borderBottom
// Exported so callers stacking additional tab bars (e.g. an outer layout
// picker) can budget height for each extra row using the same constant.
export const TAB_BAR_HEIGHT = TAB_CONTAINER_PAD * 2 +
  TAB_LABEL_PAD_Y * 2 +
  TAB_FONT_SIZE * TAB_LINE_HEIGHT +
  TAB_BORDER;

// `line-height: normal` (see TAB_LINE_HEIGHT above) is resolved by the
// visitor's browser from their OS/font-stack, not a fixed ratio — measured
// ~4px taller than this formula predicts in real-world Chrome/macOS testing,
// enough to add a visible scrollbar to a no-JS static embed sized from the
// exact estimate. No server-side formula can match every visitor's font
// metrics exactly, so pad each tab bar row a bit: a few extra blank pixels
// at the bottom is a much smaller problem than a hard scrollbar.
const TAB_BAR_HEIGHT_SAFETY_PX = 8;
export const TAB_BAR_HEIGHT_PX = Math.ceil(TAB_BAR_HEIGHT * REM_TO_PX) +
  TAB_BAR_HEIGHT_SAFETY_PX;

export const TAB_BAR_STYLE = {
  display: "flex",
  flexWrap: "nowrap",
  overflowX: "auto",
  minWidth: 0,
  gap: "0.25rem",
  padding: `${TAB_CONTAINER_PAD}rem`,
  background: "#f3f4f6",
  borderBottom: `${TAB_BORDER * REM_TO_PX}px solid #e5e7eb`,
} as const;

export const TAB_LABEL_STYLE = {
  padding: `${TAB_LABEL_PAD_Y}rem ${TAB_LABEL_PAD_X}rem`,
  borderRadius: "0.375rem",
  cursor: "pointer",
  fontSize: `${TAB_FONT_SIZE}rem`,
  fontFamily: "sans-serif",
  userSelect: "none",
  // String, not number — this renderer doesn't special-case unitless CSS
  // properties like Preact normally does, so a bare `0` would serialize as
  // the invalid `flex-shrink: 0px` and get dropped by the browser.
  flexShrink: "0",
  whiteSpace: "nowrap",
} as const;

// Caption identifying what a tab bar switches (e.g. "Layer:"). Same
// font-size/family as the pills so it doesn't change the row's height.
export const TAB_BAR_LABEL_STYLE = {
  fontSize: `${TAB_FONT_SIZE}rem`,
  fontFamily: "sans-serif",
  fontWeight: "700",
  color: "#4b5563",
  flexShrink: "0",
  alignSelf: "center",
  paddingRight: "0.25rem",
} as const;

interface StaticKeyboardEmbedProps {
  layout: KeyboardLayout;
  layers: LayerState[];
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
}

interface ScaledEmbedProps {
  /** Natural (unscaled) width/height of `children`, in rem. */
  naturalWidth: number;
  naturalHeight: number;
  /** Scale to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
  /** Applied to the outer wrapper — lets callers target it with sibling
   * CSS selectors (e.g. `#radio:checked ~ .kbd-layers-x`) despite the extra
   * DOM nesting this wrapper introduces when scaling. */
  class?: string;
  children: ComponentChildren;
}

/**
 * Wraps `children` (rendered at `naturalWidth`/`naturalHeight`, in rem) in a
 * `transform: scale(...)` container sized to fit `requestedWidth`. Used to
 * scale just the keyboard key-grid — NOT tab bars, which render as plain
 * unscaled siblings around this wrapper.
 *
 * Always renders the same nested-wrapper shape (even when scale === 1, where
 * `transform: scale(1)` is a no-op) — a client-side script re-fitting this to
 * the actual iframe width (see `routes/embed.tsx`) needs one consistent DOM
 * shape to find and update, regardless of what scale the server happened to
 * pick at request time. `data-natural-width`/`data-natural-height` expose the
 * unscaled size so that script doesn't need to reverse-parse rem values out
 * of the transform/width styles.
 */
export function ScaledEmbed(
  { naturalWidth, naturalHeight, requestedWidth, class: className, children }:
    ScaledEmbedProps,
) {
  // Never upscale — match behaviour of the JS embed
  const scale = requestedWidth != null
    ? Math.min(requestedWidth / (naturalWidth * REM_TO_PX), 1)
    : 1;

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;

  return (
    <div
      class={className}
      data-natural-width={naturalWidth}
      data-natural-height={naturalHeight}
      style={{
        display: "inline-block",
        position: "relative",
        width: `${scaledWidth}rem`,
        height: `${scaledHeight}rem`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${naturalWidth}rem`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Natural (unscaled) dimensions of just the keyboard key-grid — excludes
 * any tab bar, since tab bars are no longer part of the scaled block. */
export function computeKeyboardDimensions(
  layout: KeyboardLayout,
): { width: number; height: number } {
  let maxRowWidth = 0;
  for (const row of layout.rows) {
    const rowOffset = (row.offset ?? 0) * (BASE_WIDTH + GAP);
    let rowWidth = rowOffset + (row.keys.length - 1) * GAP;
    for (const key of row.keys) {
      rowWidth += (key.width ?? 1.0) * BASE_WIDTH;
    }
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
  }
  const numRows = layout.rows.length;
  return {
    width: maxRowWidth + 2 * KBD_PADDING,
    height: numRows * BASE_WIDTH + (numRows - 1) * GAP + 2 * KBD_PADDING,
  };
}

/**
 * Total rendered height (px) of a single `StaticKeyboardEmbed`: its one
 * always-present layer tab bar plus the scaled keyboard grid below it. The
 * picker components layer their own tab bar's height on top of this via the
 * same `TAB_BAR_HEIGHT` constant — see `computePlatformPickerHeightPx` /
 * `computeLayoutPickerHeightPx` — so a caller several levels up (routes/embed.tsx)
 * can compute the true total for whichever combination of tab bars is
 * actually rendered, without needing to render anything first.
 */
export function computeStaticEmbedHeightPx(
  layout: KeyboardLayout,
  requestedWidth?: number,
): number {
  const { width: naturalWidth, height: naturalHeight } =
    computeKeyboardDimensions(layout);
  const scale = requestedWidth != null
    ? Math.min(requestedWidth / (naturalWidth * REM_TO_PX), 1)
    : 1;
  const gridHeightPx = Math.ceil(naturalHeight * scale * REM_TO_PX);
  return TAB_BAR_HEIGHT_PX + gridHeightPx;
}

function generateLayerCss(uid: string, layers: LayerState[]): string {
  const rules: string[] = [];

  rules.push(`.kbd-layers-${uid} .kbd-layer { display: none; }`);
  rules.push(
    `.kbd-tabs-${uid} [data-layer-id] { background: #e5e7eb; color: #374151; }`,
  );

  for (const layer of layers) {
    const safeId = layerNameToId(layer.name);
    rules.push(
      `#layer-${uid}-${safeId}:checked ~ .kbd-tabs-${uid} [data-layer-id='${safeId}'] { background: #374151; color: #f9fafb; }`,
    );
    rules.push(
      `#layer-${uid}-${safeId}:checked ~ .kbd-layers-${uid} .kbd-layer-${safeId} { display: block; }`,
    );
  }

  return rules.join("\n");
}

export function StaticKeyboardEmbed({
  layout,
  layers,
  initialLayer,
  requestedWidth,
}: StaticKeyboardEmbedProps) {
  const uid = layout.id.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  const checkedLayer = layers.some((l) => l.name === initialLayer)
    ? initialLayer
    : "default";

  const labelForLayer = (layerName: string): string | null => {
    if (!layers.some((l) => l.name === layerName)) return null;
    return `layer-${uid}-${layerNameToId(layerName)}`;
  };

  const { width: naturalWidth, height: naturalHeight } =
    computeKeyboardDimensions(layout);

  return (
    <div style={{ position: "relative" }}>
      {/* Hidden radio buttons — must precede the tab bar and layers as siblings */}
      {layers.map((l) => {
        const safeId = layerNameToId(l.name);
        return (
          <input
            type="radio"
            name={`layer-${uid}`}
            id={`layer-${uid}-${safeId}`}
            class="kbd-layer-radio"
            checked={l.name === checkedLayer}
            aria-label={`Keyboard layer: ${l.label}`}
          />
        );
      })}

      {/* Layer tab toolbar — unscaled, always full size */}
      <div
        class={`kbd-tabs-${uid}`}
        role="tablist"
        aria-labelledby={`layer-tabs-label-${uid}`}
        style={TAB_BAR_STYLE}
      >
        <span id={`layer-tabs-label-${uid}`} style={TAB_BAR_LABEL_STYLE}>
          Layer:
        </span>
        {layers.map((l) => (
          <label
            for={`layer-${uid}-${layerNameToId(l.name)}`}
            role="tab"
            aria-selected={l.name === checkedLayer ? "true" : "false"}
            data-layer={l.name}
            data-layer-id={layerNameToId(l.name)}
            style={TAB_LABEL_STYLE}
          >
            {l.label}
          </label>
        ))}
      </div>

      {/* One fully-rendered keyboard per layer, scaled to requestedWidth */}
      <ScaledEmbed
        class={`kbd-layers-${uid}`}
        naturalWidth={naturalWidth}
        naturalHeight={naturalHeight}
        requestedWidth={requestedWidth}
      >
        {layers.map((l) => (
          <div
            class={`kbd-layer kbd-layer-${layerNameToId(l.name)}`}
            data-layer={l.name}
            aria-hidden={l.name !== checkedLayer ? "true" : undefined}
          >
            <KeyboardDisplay
              layout={layout}
              activeLayer={l.activeLayer}
              isShiftActive={l.isShiftActive}
              isCapsLockActive={l.isCapsLockActive}
              isAltActive={l.isAltActive}
              isCmdActive={l.isCmdActive}
              isCtrlActive={l.isCtrlActive}
              isSymbolsActive={l.isSymbolsActive}
              isSymbols2Active={l.isSymbols2Active}
              showChrome={false}
              labelForLayer={labelForLayer}
            />
          </div>
        ))}
      </ScaledEmbed>

      <style>{generateLayerCss(uid, layers)}</style>
    </div>
  );
}
