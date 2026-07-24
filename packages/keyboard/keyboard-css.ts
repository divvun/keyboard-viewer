// Generated from keyboard.css by scripts/generate-css-module.ts — do not edit directly.
export const keyboardCss: string = `
/*
 * Divvun keyboard core styles — self-contained and import-safe.
 *
 * Every rule is scoped under .dvk / .dvk-* so this file can be imported by
 * any host page (borealium, legacy sites, the viewer app) without leaking
 * into host styles. No global resets — anything the components need from a
 * reset is declared on the .dvk subtree itself.
 */

.dvk,
.dvk *,
.dvk *::before,
.dvk *::after {
  box-sizing: border-box;
}

.dvk {
  line-height: 1.5;
  font-family:
    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Noto Color Emoji";
}

/* Layer/layout/platform switching radios — visually hidden but still
 * focusable state carriers for the pure-CSS :checked machinery. */
.dvk-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
  margin: 0;
}

/* Tab bars (layer / platform / layout pickers). Unscaled UI chrome — these
 * stay legible regardless of how much the keyboard shrinks to fit. */
.dvk-tabs {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  min-width: 0;
  gap: 0.25rem;
  margin: 0;
  padding: 0.5rem;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.dvk-tabs-caption {
  font-size: 0.875rem;
  font-weight: 700;
  color: #4b5563;
  flex-shrink: 0;
  align-self: center;
  padding-right: 0.25rem;
}

.dvk-tab {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  user-select: none;
  flex-shrink: 0;
  white-space: nowrap;
  background: #e5e7eb;
  color: #374151;
}

/* Key grid */
.dvk-board {
  display: inline-block;
  padding: 1rem;
  background: #e5e7eb;
  border-radius: 0 0 0.5rem 0.5rem;
}

.dvk-row {
  display: flex;
}

.dvk-row--center {
  justify-content: center;
}

/* A single key. Rendered as <button>, <label>, or <span> depending on
 * context — the rule declares everything those elements would otherwise get
 * from UA/host styles so all three render identically. */
.dvk-key {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 2px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  color: inherit;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition-property: box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: 1.5rem;
  line-height: 1.75rem;
  cursor: pointer;
  user-select: none;
}

.dvk-key:hover {
  background: #e5e7eb;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.dvk-key--fn {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.dvk-key--icon {
  font-size: 1.5rem;
}

.dvk-key--active {
  background: #e5e7eb;
  color: #1f2937;
  border-color: #9ca3af;
}

/* Test text area — present in the markup everywhere, but only revealed when
 * scripting is available: without JS nothing could wire it up, so a no-JS
 * browser never sees it. No JS runs to show it either — the media query is
 * the whole mechanism. */
.dvk-input {
  display: none;
  margin-bottom: 0.5rem;
}

@media (scripting: enabled) {
  .dvk-input {
    display: block;
  }
}

.dvk-input-field {
  display: block;
  width: 100%;
  min-height: 4rem;
  margin: 0;
  padding: 0.5rem;
  border: 2px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-family: inherit;
  font-size: 1.125rem;
  line-height: inherit;
  resize: vertical;
}

.dvk-input-field:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Loading / error placeholders */
.dvk-status {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #4b5563;
}

.dvk-status--error {
  color: #dc2626;
}

/* Centering wrapper used by the full viewer chrome */
.dvk-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
