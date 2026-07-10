export const REM_TO_PX = 16;

// Tab bar sizing constants. The visual styling itself lives in keyboard.css
// (.dvk-tabs / .dvk-tab / .dvk-tabs-caption) — these constants MUST stay in
// sync with those rules, because the server-side embed-height math below is
// derived from them.
export const TAB_FONT_SIZE = 0.875; // rem — .dvk-tab font-size
const TAB_LINE_HEIGHT = 1.2; // unitless — browser "normal" approximation
export const TAB_LABEL_PAD_Y = 0.25; // rem — .dvk-tab padding top/bottom
export const TAB_CONTAINER_PAD = 0.5; // rem — .dvk-tabs padding
const TAB_BORDER = 1 / REM_TO_PX; // rem — .dvk-tabs 1px border-bottom

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

/** Sanitizes an arbitrary string into a CSS class/id-safe fragment. */
export function slugifyId(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}
