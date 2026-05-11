import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { layerNameToId } from "../utils/layer-state.ts";
import { KeyboardDisplay } from "./KeyboardDisplay.tsx";

const BASE_WIDTH = 3.5; // rem — matches Key component
const GAP = 0.25; // rem — matches KeyboardLayout row gap
const KBD_PADDING = 1; // rem — p-4 on each side
// Tab bar: 0.5rem padding × 2 + label (0.875rem font × 1.2 line-height + 0.25rem padding × 2)
const TAB_BAR_HEIGHT = 2.55; // rem — single-row approximate height
const REM_TO_PX = 16;
const SHADOW_BUFFER_PX = 12; // room for the keyboard's drop shadow

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

  for (const layer of layers) {
    const safeId = layerNameToId(layer.name);
    rules.push(
      `#layer-${uid}-${safeId}:checked ~ .kbd-layers-${uid} .kbd-layer-${safeId} { display: block; }`,
    );
    rules.push(
      `#layer-${uid}-${safeId}:checked ~ .kbd-tabs-${uid} [data-layer="${layer.name}"] {
        background: #4a6cf7;
        color: white;
      }`,
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
  // Exposed so embedders know the exact iframe dimensions to set
  const embedWidth = Math.ceil(scaledWidth * REM_TO_PX) + SHADOW_BUFFER_PX;
  const embedHeight = Math.ceil(scaledHeight * REM_TO_PX) + SHADOW_BUFFER_PX;

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
          padding: "0.5rem",
          background: "#f3f4f6",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {layers.map((l) => (
          <label
            for={`layer-${uid}-${layerNameToId(l.name)}`}
            data-layer={l.name}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "sans-serif",
              background: "#e5e7eb",
              color: "#374151",
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
        data-embed-width={embedWidth}
        data-embed-height={embedHeight}
        style={{
          display: "inline-block",
          position: "relative",
          width: `calc(${scaledWidth}rem + ${SHADOW_BUFFER_PX}px)`,
          height: `calc(${scaledHeight}rem + ${SHADOW_BUFFER_PX}px)`,
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
      data-embed-width={embedWidth}
      data-embed-height={embedHeight}
      style={{
        display: "inline-block",
        width: `${naturalWidth}rem`,
        padding: `0 ${SHADOW_BUFFER_PX}px ${SHADOW_BUFFER_PX}px 0`,
      }}
    >
      {content}
    </div>
  );
}
