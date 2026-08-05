import { type ComponentChildren, h } from "preact";

export interface CssTabPickerItem<T> {
  /** Sanitized, unique-within-this-tab-bar id fragment (see `slugifyId`). */
  id: string;
  /** Rendered content for the tab pill. */
  label: ComponentChildren;
  /** aria-label for the item's (hidden) radio input. */
  ariaLabel: string;
  /** Extra data-* attributes for the radio input — e.g. the layer tab bar
   * sets data-layer so the hydrated <Keyboard> can find and drive the radio
   * that corresponds to a layer name. */
  data?: Record<string, string>;
  /** Whatever domain object this tab represents — handed back to
   * `renderView` so callers don't need to re-look it up by `id`. */
  value: T;
}

interface CssTabPickerProps<T> {
  /** Segment used to build every class/id/name this tab bar renders, e.g.
   * "layer" | "platform" | "layout" — keeps nested tab bars (layer inside
   * platform inside layout) from colliding on one page. */
  dimension: string;
  /** Unique per rendered tree (usually derived from kbd + whichever combo
   * path led here); combined with `dimension` for full uniqueness. */
  uid: string;
  /** Caption shown before the pills, e.g. "Layer:". */
  caption: string;
  items: CssTabPickerItem<T>[];
  checkedId: string;
  /** Hydration hook: called when the user checks an item's radio. Absent in
   * pure-static SSR usage — handlers never serialize to HTML, so the markup
   * is identical either way. */
  onCheck?: (item: CssTabPickerItem<T>) => void;
  /** Renders one item's content. `hidden` is for `aria-hidden` only —
   * visibility itself is driven by the generated `:checked` CSS below. */
  renderView: (
    item: CssTabPickerItem<T>,
    hidden: boolean,
  ) => ComponentChildren;
  /** Wraps the views container — defaults to a plain `<div>`. Override to
   * scale every view together as one block (see StaticKeyboardEmbed's layer
   * tab bar: switching layers never changes the keyboard's dimensions, so
   * every layer shares one `ScaledEmbed`) instead of the default where each
   * item is fully independent (platform/layout tab bars, where different
   * items can have entirely different natural dimensions). */
  wrapViews?: (
    viewsClassName: string,
    children: ComponentChildren,
  ) => ComponentChildren;
  /** By default, a single item collapses to just its view with no tab bar
   * chrome at all (platform/layout tab bars do this — nothing to switch
   * between). Layer tabs always show, even with one layer. */
  alwaysShowTabBar?: boolean;
}

function generateTabCss(
  dimension: string,
  uid: string,
  itemIds: string[],
): string {
  const rules: string[] = [];
  rules.push(
    `.kbd-${dimension}-views-${uid} .kbd-${dimension}-view { display: none; }`,
  );
  for (const id of itemIds) {
    rules.push(
      `#${dimension}-${uid}-${id}:checked ~ .kbd-${dimension}-tabs-${uid} [data-tab-id='${id}'] { background: #374151; color: #f9fafb; }`,
    );
    rules.push(
      `#${dimension}-${uid}-${id}:checked ~ .kbd-${dimension}-views-${uid} .kbd-${dimension}-view-${id} { display: block; }`,
    );
  }
  return rules.join("\n");
}

/**
 * Generic CSS-only (no JS) radio-driven tab picker — the shared shape behind
 * the layer, platform, and layout tab bars: hidden radio inputs plus `~`
 * sibling-selector CSS toggle which item is visible, so switching tabs never
 * needs JavaScript or a network request.
 */
export function CssTabPicker<T>({
  dimension,
  uid,
  caption,
  items,
  checkedId,
  onCheck,
  renderView,
  wrapViews = (className, children) => <div class={className}>{children}</div>,
  alwaysShowTabBar = false,
}: CssTabPickerProps<T>) {
  if (items.length <= 1 && !alwaysShowTabBar) {
    return <>{renderView(items[0], false)}</>;
  }

  const groupName = `${dimension}-${uid}`;
  const viewsClassName = `kbd-${dimension}-views-${uid}`;

  return (
    <div class="dvk dvk-tab-picker" style={{ position: "relative" }}>
      {/* Hidden radio buttons — must precede the tab bar and views as siblings */}
      {items.map((item) =>
        // h() instead of JSX, deliberately. Two constraints meet here:
        // 1. The radios must be uncontrolled (defaultChecked, never
        //    checked): the DOM radios are the single source of truth for the
        //    visible view — the no-JS :checked machinery depends on that,
        //    and Preact force-applies a `checked` prop even during
        //    hydration, which would clobber a switch the user made before
        //    island JS loaded.
        // 2. This package is compiled by its CONSUMER's JSX config, and
        //    Deno's `jsx: "precompile"` (the Fresh default) serializes JSX
        //    defaultChecked as a literal lowercase `defaultchecked`
        //    attribute — never mapped to `checked`, so the initial tab
        //    renders unchecked. The runtime factory maps it correctly under
        //    every compiler.
        h("input", {
          type: "radio",
          name: groupName,
          id: `${groupName}-${item.id}`,
          class: "dvk-radio",
          ...(item.data ?? {}),
          defaultChecked: item.id === checkedId,
          onChange: onCheck && (() => onCheck(item)),
          "aria-label": item.ariaLabel,
        })
      )}

      {/* Tab toolbar — unscaled, always full size */}
      <div
        class={`dvk-tabs kbd-${dimension}-tabs-${uid}`}
        role="tablist"
        aria-labelledby={`${dimension}-tabs-label-${uid}`}
      >
        <span
          id={`${dimension}-tabs-label-${uid}`}
          class="dvk-tabs-caption"
        >
          {caption}
        </span>
        {items.map((item) => (
          <label
            for={`${groupName}-${item.id}`}
            role="tab"
            class="dvk-tab"
            aria-selected={item.id === checkedId ? "true" : "false"}
            data-tab-id={item.id}
          >
            {item.label}
          </label>
        ))}
      </div>

      {wrapViews(
        viewsClassName,
        <>
          {items.map((item) => (
            <div
              class={`kbd-${dimension}-view kbd-${dimension}-view-${item.id}`}
              aria-hidden={item.id === checkedId ? undefined : "true"}
            >
              {renderView(item, item.id !== checkedId)}
            </div>
          ))}
        </>,
      )}

      <style>{generateTabCss(dimension, uid, items.map((i) => i.id))}</style>
    </div>
  );
}
