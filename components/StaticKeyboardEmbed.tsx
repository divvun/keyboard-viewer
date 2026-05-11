import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { layerNameToId } from "../utils/layer-state.ts";
import { KeyboardDisplay } from "./KeyboardDisplay.tsx";

const BASE_WIDTH = 3.5; // rem — matches Key component
const GAP = 0.25; // rem — matches KeyboardLayout row gap
const KBD_PADDING = 1; // rem — p-4 on each side
const REM_TO_PX = 16;

// Tab bar height derived from the inline styles applied below.
// Line-height is the only approximation: browsers default "normal" ≈ 1.2 for sans-serif.
const TAB_FONT_SIZE = 0.875; // rem — fontSize on <label>
const TAB_LINE_HEIGHT = 1.2; // unitless — browser "normal" approximation
const TAB_LABEL_PAD_Y = 0.25; // rem — padding top/bottom on <label>
const TAB_CONTAINER_PAD = 0.5; // rem — padding on tab bar container
const TAB_BORDER = 1 / REM_TO_PX; // rem — 1px borderBottom
const TAB_BAR_HEIGHT = TAB_CONTAINER_PAD * 2 +
  TAB_LABEL_PAD_Y * 2 +
  TAB_FONT_SIZE * TAB_LINE_HEIGHT +
  TAB_BORDER;

interface StaticKeyboardEmbedProps {
  layout: KeyboardLayout;
  layers: LayerState[];
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
}

function computeKeyboardDimensions(
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
    height: TAB_BAR_HEIGHT + numRows * BASE_WIDTH + (numRows - 1) * GAP +
      2 * KBD_PADDING,
  };
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
      `#layer-${uid}-${safeId}:checked ~ .kbd-layers-${uid} .kbd-layer-${safeId} { display: block; }`,
    );
    rules.push(
      `#layer-${uid}-${safeId}:checked ~ .kbd-tabs-${uid} [data-layer-id='${safeId}'] { background: #374151; color: #f9fafb; }`,
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

  // Never upscale — match behaviour of the JS embed
  const scale = requestedWidth != null
    ? Math.min(requestedWidth / (naturalWidth * REM_TO_PX), 1)
    : 1;

  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;
  // Exposed so embedders know the exact iframe height to set
  const embedHeight = Math.ceil(scaledHeight * REM_TO_PX);

  const content = (
    <div style={{ position: "relative" }}>
      {/* Hidden radio buttons — must precede tabs and layers as siblings */}
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

      {/* Layer tab toolbar */}
      <div
        class={`kbd-tabs-${uid}`}
        role="tablist"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          overflowX: "auto",
          minWidth: 0,
          gap: "0.25rem",
          padding: `${TAB_CONTAINER_PAD}rem`,
          background: "#f3f4f6",
          borderBottom: `${TAB_BORDER * REM_TO_PX}px solid #e5e7eb`,
        }}
      >
        {layers.map((l) => (
          <label
            for={`layer-${uid}-${layerNameToId(l.name)}`}
            role="tab"
            aria-selected={l.name === checkedLayer ? "true" : "false"}
            data-layer={l.name}
            data-layer-id={layerNameToId(l.name)}
            style={{
              padding: `${TAB_LABEL_PAD_Y}rem 0.75rem`,
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: `${TAB_FONT_SIZE}rem`,
              fontFamily: "sans-serif",
              userSelect: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {l.label}
          </label>
        ))}
      </div>

      {/* One fully-rendered keyboard per layer */}
      <div class={`kbd-layers-${uid}`}>
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
      </div>

      <style>{generateLayerCss(uid, layers)}</style>
    </div>
  );

  if (scale !== 1) {
    return (
      <div
        data-embed-height={embedHeight}
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
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      data-embed-height={embedHeight}
      style={{ display: "inline-block", width: `${naturalWidth}rem` }}
    >
      {content}
    </div>
  );
}
