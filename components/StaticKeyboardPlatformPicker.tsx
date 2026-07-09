import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import type { Platform } from "../constants/platforms.ts";
import {
  computeStaticEmbedHeightPx,
  StaticKeyboardEmbed,
  TAB_BAR_HEIGHT_PX,
  TAB_BAR_LABEL_STYLE,
  TAB_BAR_STYLE,
  TAB_LABEL_STYLE,
} from "./StaticKeyboardEmbed.tsx";

export interface PlatformCombo {
  platform: Platform;
  layout: KeyboardLayout;
  layers: LayerState[];
}

interface StaticKeyboardPlatformPickerProps {
  /** Unique per (kbd, layout) — keeps radio names from colliding when this
   * picker is nested once per layout inside StaticKeyboardLayoutPicker. */
  uidPrefix: string;
  combos: PlatformCombo[];
  initialPlatform: Platform;
  initialLayer: string;
  /** Scale keyboard to this pixel width. Never upscales beyond natural size. */
  requestedWidth?: number;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  macOS: "macOS",
  windows: "Windows",
  chromeOS: "Chrome OS",
  android: "Android",
  iOS: "iOS",
} as Record<Platform, string>;

function platformToId(platform: string): string {
  return platform.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function generatePlatformCss(uid: string, combos: PlatformCombo[]): string {
  const rules: string[] = [];

  rules.push(
    `.kbd-platform-views-${uid} .kbd-platform-view { display: none; }`,
  );
  rules.push(
    `.kbd-platform-tabs-${uid} [data-platform-id] { background: #e5e7eb; color: #374151; }`,
  );

  for (const combo of combos) {
    const safeId = platformToId(combo.platform);
    rules.push(
      `#platform-${uid}-${safeId}:checked ~ .kbd-platform-tabs-${uid} [data-platform-id='${safeId}'] { background: #374151; color: #f9fafb; }`,
    );
    rules.push(
      `#platform-${uid}-${safeId}:checked ~ .kbd-platform-views-${uid} .kbd-platform-view-${safeId} { display: block; }`,
    );
  }

  return rules.join("\n");
}

/**
 * Total rendered height (px) of a `StaticKeyboardPlatformPicker` for the
 * platform that would actually be checked at SSR time — mirrors the
 * `checkedPlatform` fallback logic in the component below exactly, so the
 * height this reports always matches what gets rendered.
 */
export function computePlatformPickerHeightPx(
  combos: PlatformCombo[],
  initialPlatform: Platform,
  requestedWidth?: number,
): number {
  if (combos.length === 1) {
    return computeStaticEmbedHeightPx(combos[0].layout, requestedWidth);
  }
  const checked = combos.find((c) => c.platform === initialPlatform) ??
    combos[0];
  return TAB_BAR_HEIGHT_PX +
    computeStaticEmbedHeightPx(checked.layout, requestedWidth);
}

/**
 * Renders a single keyboard when only one platform is in scope for this
 * layout (the common case). When a layout file declares more than one
 * platform (e.g. mhr declares all five), renders an outer platform tab bar
 * above the keyboard, toggled the same pure-CSS radio way as the layer and
 * layout tabs. The tab bar itself is unscaled UI chrome — only the nested
 * keyboards (via `StaticKeyboardEmbed`) scale to `requestedWidth`.
 */
export function StaticKeyboardPlatformPicker({
  uidPrefix,
  combos,
  initialPlatform,
  initialLayer,
  requestedWidth,
}: StaticKeyboardPlatformPickerProps) {
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

  const uid = platformToId(uidPrefix);

  const checkedPlatform = combos.some((c) => c.platform === initialPlatform)
    ? initialPlatform
    : combos[0].platform;

  return (
    <div style={{ position: "relative" }}>
      {/* Hidden radio buttons — must precede the tab bar and views as siblings */}
      {combos.map((c) => {
        const safeId = platformToId(c.platform);
        return (
          <input
            type="radio"
            name={`platform-${uid}`}
            id={`platform-${uid}-${safeId}`}
            class="kbd-platform-radio"
            checked={c.platform === checkedPlatform}
            aria-label={`Platform: ${PLATFORM_LABELS[c.platform]}`}
          />
        );
      })}

      {/* Platform tab toolbar — unscaled, always full size */}
      <div
        class={`kbd-platform-tabs-${uid}`}
        role="tablist"
        aria-labelledby={`platform-tabs-label-${uid}`}
        style={TAB_BAR_STYLE}
      >
        <span id={`platform-tabs-label-${uid}`} style={TAB_BAR_LABEL_STYLE}>
          Platform:
        </span>
        {combos.map((c) => (
          <label
            for={`platform-${uid}-${platformToId(c.platform)}`}
            role="tab"
            aria-selected={c.platform === checkedPlatform ? "true" : "false"}
            data-platform={c.platform}
            data-platform-id={platformToId(c.platform)}
            style={TAB_LABEL_STYLE}
          >
            {PLATFORM_LABELS[c.platform] ?? c.platform}
          </label>
        ))}
      </div>

      {
        /* One fully self-contained keyboard embed per platform, each scaling
          independently to requestedWidth. */
      }
      <div class={`kbd-platform-views-${uid}`}>
        {combos.map((c) => (
          <div
            class={`kbd-platform-view kbd-platform-view-${
              platformToId(c.platform)
            }`}
            data-platform={c.platform}
            aria-hidden={c.platform !== checkedPlatform ? "true" : undefined}
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

      <style>{generatePlatformCss(uid, combos)}</style>
    </div>
  );
}
