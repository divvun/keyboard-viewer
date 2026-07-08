import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import {
  computeKeyboardDimensions,
  REM_TO_PX,
  StaticKeyboardEmbed,
  TAB_BAR_HEIGHT,
} from "./StaticKeyboardEmbed.tsx";

export interface LayoutCombo {
  /** Layout file name without the .yaml extension, e.g. "smj-NO". */
  file: string;
  /** Human-readable label, e.g. from the file's displayNames.en. */
  displayName: string;
  layout: KeyboardLayout;
  layers: LayerState[];
}

interface StaticKeyboardLayoutPickerProps {
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
}

function fileToId(file: string): string {
  return file.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function generateLayoutCss(uid: string, combos: LayoutCombo[]): string {
  const rules: string[] = [];

  rules.push(`.kbd-views-${uid} .kbd-view { display: none; }`);
  rules.push(
    `.kbd-layout-tabs-${uid} [data-layout-id] { background: #e5e7eb; color: #374151; }`,
  );

  for (const combo of combos) {
    const safeId = fileToId(combo.file);
    rules.push(
      `#layout-${uid}-${safeId}:checked ~ .kbd-views-${uid} .kbd-view-${safeId} { display: block; }`,
    );
    rules.push(
      `#layout-${uid}-${safeId}:checked ~ .kbd-layout-tabs-${uid} [data-layout-id='${safeId}'] { background: #374151; color: #f9fafb; }`,
    );
  }

  return rules.join("\n");
}

/**
 * Renders a single keyboard when only one layout is in scope (the common
 * case). When multiple layout files exist for a kbd (e.g. smj-NO/smj-SE),
 * renders an outer layout tab bar above the keyboard, toggled the same
 * pure-CSS radio way as the layer tabs inside `StaticKeyboardEmbed`.
 */
export function StaticKeyboardLayoutPicker({
  kbd,
  combos,
  initialFile,
  initialLayer,
  requestedWidth,
}: StaticKeyboardLayoutPickerProps) {
  if (combos.length === 1) {
    return (
      <StaticKeyboardEmbed
        layout={combos[0].layout}
        layers={combos[0].layers}
        initialLayer={initialLayer}
        requestedWidth={requestedWidth}
      />
    );
  }

  const uid = fileToId(kbd);

  const checkedFile = combos.some((c) => c.file === initialFile)
    ? initialFile
    : combos[0].file;

  // Informational only — exposed the same way StaticKeyboardEmbed exposes
  // its own height, since the parent page can't read into the iframe
  // without JS/postMessage in the no-JS embed path.
  const embedHeight = Math.ceil(
    Math.max(
          ...combos.map((c) => computeKeyboardDimensions(c.layout).height),
        ) * REM_TO_PX + TAB_BAR_HEIGHT * REM_TO_PX,
  );

  return (
    <div data-embed-height={embedHeight} style={{ position: "relative" }}>
      {/* Hidden radio buttons — must precede the tab bar and views as siblings */}
      {combos.map((c) => {
        const safeId = fileToId(c.file);
        return (
          <input
            type="radio"
            name={`layout-${uid}`}
            id={`layout-${uid}-${safeId}`}
            class="kbd-layout-radio"
            checked={c.file === checkedFile}
            aria-label={`Keyboard layout: ${c.displayName}`}
          />
        );
      })}

      {/* Layout tab toolbar */}
      <div
        class={`kbd-layout-tabs-${uid}`}
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
        {combos.map((c) => (
          <label
            for={`layout-${uid}-${fileToId(c.file)}`}
            role="tab"
            aria-selected={c.file === checkedFile ? "true" : "false"}
            data-layout={c.file}
            data-layout-id={fileToId(c.file)}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "sans-serif",
              userSelect: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {c.displayName}
          </label>
        ))}
      </div>

      {/* One fully self-contained keyboard embed per layout */}
      <div class={`kbd-views-${uid}`}>
        {combos.map((c) => (
          <div
            class={`kbd-view kbd-view-${fileToId(c.file)}`}
            data-layout={c.file}
            aria-hidden={c.file !== checkedFile ? "true" : undefined}
          >
            <StaticKeyboardEmbed
              layout={c.layout}
              layers={c.layers}
              initialLayer={initialLayer}
              requestedWidth={requestedWidth}
            />
          </div>
        ))}
      </div>

      <style>{generateLayoutCss(uid, combos)}</style>
    </div>
  );
}
