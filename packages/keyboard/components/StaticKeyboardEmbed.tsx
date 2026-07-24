import { Component, type ComponentChildren, type JSX } from "preact";
import type {
  Key as KeyType,
  KeyboardLayout,
} from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { layerNameToId } from "../utils/layer-state.ts";
import { REM_TO_PX, slugifyId, TAB_BAR_HEIGHT_PX } from "../utils/tab-bar.ts";
import { CssTabPicker } from "./CssTabPicker.tsx";
import { KeyboardDisplay } from "./KeyboardDisplay.tsx";

export { REM_TO_PX };

const BASE_WIDTH = 3.5; // rem — matches Key component
const GAP = 0.25; // rem — matches KeyboardLayout row gap
const KBD_PADDING = 1; // rem — p-4 on each side

/**
 * Hydration pass-throughs, used by the hydrated keyboard components
 * (components/Keyboard.tsx, components/KeyboardPicker.tsx). All optional —
 * when absent (pure-static SSR usage, e.g. the picker components on their
 * own) the rendered markup is identical, since handlers never serialize to
 * HTML. Bundled into one type so callers threading it through multiple
 * nested picker levels (see StaticKeyboardPlatformPicker/
 * StaticKeyboardLayoutPicker's `embedHydration` prop) don't repeat all 5
 * field names at every level.
 */
export interface KeyboardEmbedHydration {
  checkedLayer?: string;
  onLayerChange?: (layerName: string) => void;
  onKeyClick?: (key: KeyType) => void;
  pressedKeyId?: string | null;
  pendingDeadkey?: string | null;
}

interface StaticKeyboardEmbedProps extends KeyboardEmbedHydration {
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
 * same `TAB_BAR_HEIGHT_PX` constant — see `computePlatformPickerHeightPx` /
 * `computeLayoutPickerHeightPx` — so a caller several levels up
 * (routes/embed.tsx) can compute the true total for whichever combination of
 * tab bars is actually rendered, without needing to render anything first.
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

function StaticKeyboardEmbedInner({
  layout,
  layers,
  initialLayer,
  requestedWidth,
  checkedLayer: checkedLayerProp,
  onLayerChange,
  onKeyClick,
  pressedKeyId,
  pendingDeadkey,
}: StaticKeyboardEmbedProps) {
  const uid = slugifyId(layout.id);

  const checkedLayer = checkedLayerProp ??
    (layers.some((l) => l.name === initialLayer) ? initialLayer : "default");

  const labelForLayer = (layerName: string): string | null => {
    if (!layers.some((l) => l.name === layerName)) return null;
    return `layer-${uid}-${layerNameToId(layerName)}`;
  };

  const { width: naturalWidth, height: naturalHeight } =
    computeKeyboardDimensions(layout);

  return (
    <CssTabPicker
      dimension="layer"
      uid={uid}
      caption="Layer:"
      alwaysShowTabBar
      checkedId={layerNameToId(checkedLayer)}
      onCheck={onLayerChange && ((item) => onLayerChange(item.value.name))}
      items={layers.map((l) => ({
        id: layerNameToId(l.name),
        label: l.label,
        ariaLabel: `Keyboard layer: ${l.label}`,
        // Lets the hydrated <Keyboard> map a layer NAME (e.g. "caps+shift")
        // back to its radio — ids are slugified and not reversible.
        data: { "data-layer": l.name },
        value: l,
      }))}
      wrapViews={(className, children) => (
        <ScaledEmbed
          class={className}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          requestedWidth={requestedWidth}
        >
          {children}
        </ScaledEmbed>
      )}
      renderView={({ value: l }) => (
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
          onKeyClick={onKeyClick}
          pressedKeyId={pressedKeyId}
          pendingDeadkey={pendingDeadkey}
        />
      )}
    />
  );
}

function shallowPropsEqual(
  a: StaticKeyboardEmbedProps,
  b: StaticKeyboardEmbedProps,
): boolean {
  const aKeys = Object.keys(a) as (keyof StaticKeyboardEmbedProps)[];
  const bKeys = Object.keys(b) as (keyof StaticKeyboardEmbedProps)[];
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

/**
 * `KeyboardPicker` renders every layout x platform combo simultaneously (the
 * no-JS radio/:checked machinery needs all of them present), but only wires
 * live typing/press state into the one that's actually checked — every other
 * combo's props are therefore referentially stable across a re-render caused
 * by, say, a keystroke in the active one. Without this, Preact would still
 * re-invoke and re-diff every hidden combo's full layer x key tree on every
 * keystroke, which is the dominant cost that made hardware typing feel slow
 * once there could be several combos in the tree instead of just one.
 */
export class StaticKeyboardEmbed extends Component<StaticKeyboardEmbedProps> {
  override shouldComponentUpdate(
    nextProps: StaticKeyboardEmbedProps,
  ): boolean {
    return !shallowPropsEqual(this.props, nextProps);
  }

  override render(): JSX.Element {
    return <StaticKeyboardEmbedInner {...this.props} />;
  }
}
