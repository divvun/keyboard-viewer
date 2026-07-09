export const REM_TO_PX = 16;

// Tab bar sizing — shared across every CSS-only tab bar (layer, platform,
// layout) so they always look identical. Deliberately NOT scaled along with
// the keyboard: tab bars are UI chrome and should stay legible/tappable
// regardless of how much the keyboard itself has to shrink to fit a
// requested width.
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
// at the bottom is a much smaller problem than a scrollbar.
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

/** Sanitizes an arbitrary string into a CSS class/id-safe fragment. */
export function slugifyId(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}
