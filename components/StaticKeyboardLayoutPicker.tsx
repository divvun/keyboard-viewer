import type { Platform } from "../constants/platforms.ts";
import {
  TAB_BAR_LABEL_STYLE,
  TAB_BAR_STYLE,
  TAB_LABEL_STYLE,
} from "./StaticKeyboardEmbed.tsx";
import {
  type PlatformCombo,
  StaticKeyboardPlatformPicker,
} from "./StaticKeyboardPlatformPicker.tsx";

export type { PlatformCombo };

export interface LayoutCombo {
  /** Layout file name without the .yaml extension, e.g. "smj-NO". */
  file: string;
  /** Human-readable label, e.g. from the file's displayNames.en. */
  displayName: string;
  platformCombos: PlatformCombo[];
}

interface StaticKeyboardLayoutPickerProps {
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialPlatform: Platform;
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
      `#layout-${uid}-${safeId}:checked ~ .kbd-layout-tabs-${uid} [data-layout-id='${safeId}'] { background: #374151; color: #f9fafb; }`,
    );
    rules.push(
      `#layout-${uid}-${safeId}:checked ~ .kbd-views-${uid} .kbd-view-${safeId} { display: block; }`,
    );
  }

  return rules.join("\n");
}

/**
 * Renders a single (nested platform-picker) keyboard when only one layout is
 * in scope (the common case). When multiple layout files exist for a kbd
 * (e.g. smj-NO/smj-SE), renders an outer layout tab bar above the keyboard,
 * toggled the same pure-CSS radio way as the layer tabs inside
 * `StaticKeyboardEmbed`. The tab bar itself is unscaled UI chrome — only the
 * nested keyboards scale to `requestedWidth`.
 */
export function StaticKeyboardLayoutPicker({
  kbd,
  combos,
  initialFile,
  initialPlatform,
  initialLayer,
  requestedWidth,
}: StaticKeyboardLayoutPickerProps) {
  if (combos.length === 1) {
    return (
      <StaticKeyboardPlatformPicker
        uidPrefix={`${kbd}-${combos[0].file}`}
        combos={combos[0].platformCombos}
        initialPlatform={initialPlatform}
        initialLayer={initialLayer}
        requestedWidth={requestedWidth}
      />
    );
  }

  const uid = fileToId(kbd);

  const checkedFile = combos.some((c) => c.file === initialFile)
    ? initialFile
    : combos[0].file;

  return (
    <div style={{ position: "relative" }}>
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

      {/* Layout tab toolbar — unscaled, always full size */}
      <div
        class={`kbd-layout-tabs-${uid}`}
        role="tablist"
        aria-labelledby={`layout-tabs-label-${uid}`}
        style={TAB_BAR_STYLE}
      >
        <span id={`layout-tabs-label-${uid}`} style={TAB_BAR_LABEL_STYLE}>
          Layout:
        </span>
        {combos.map((c) => (
          <label
            for={`layout-${uid}-${fileToId(c.file)}`}
            role="tab"
            aria-selected={c.file === checkedFile ? "true" : "false"}
            data-layout={c.file}
            data-layout-id={fileToId(c.file)}
            style={TAB_LABEL_STYLE}
          >
            {c.displayName}
          </label>
        ))}
      </div>

      {
        /* One fully self-contained platform picker per layout, each scaling
          independently to requestedWidth. */
      }
      <div class={`kbd-views-${uid}`}>
        {combos.map((c) => (
          <div
            class={`kbd-view kbd-view-${fileToId(c.file)}`}
            data-layout={c.file}
            aria-hidden={c.file !== checkedFile ? "true" : undefined}
          >
            <StaticKeyboardPlatformPicker
              uidPrefix={`${kbd}-${c.file}`}
              combos={c.platformCombos}
              initialPlatform={initialPlatform}
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
