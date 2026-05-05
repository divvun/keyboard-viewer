import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { layerNameToId } from "../utils/layer-state.ts";
import { KeyboardDisplay } from "./KeyboardDisplay.tsx";

interface StaticKeyboardEmbedProps {
  layout: KeyboardLayout;
  layers: LayerState[];
  initialLayer: string;
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

  rules.push(`
    .kbd-layer-radio {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
    }
  `);

  return rules.join("\n");
}

export function StaticKeyboardEmbed({
  layout,
  layers,
  initialLayer,
}: StaticKeyboardEmbedProps) {
  const uid = layout.id.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  const checkedLayer = layers.some((l) => l.name === initialLayer)
    ? initialLayer
    : "default";

  const labelForLayer = (layerName: string): string | null => {
    if (!layers.some((l) => l.name === layerName)) return null;
    return `layer-${uid}-${layerNameToId(layerName)}`;
  };

  return (
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
          flexWrap: "wrap",
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
}
