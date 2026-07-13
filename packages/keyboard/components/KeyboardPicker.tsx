import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import type { DeviceVariant, Platform } from "../constants/platforms.ts";
import type { LayoutCombo, PlatformCombo } from "../types/combo-tree.ts";
import { slugifyId } from "../utils/tab-bar.ts";
import {
  findKeyByCode,
  getKeyOutput,
  isModifierKey,
} from "../utils/key-helpers.ts";
import { getActiveLayer } from "../utils/modifiers.ts";
import { deleteBackward } from "../utils/textarea.ts";
import { BACKSPACE_KEY, ENTER_KEY, TAB_KEY } from "../constants/key-ids.ts";
import { StaticKeyboardLayoutPicker } from "./StaticKeyboardLayoutPicker.tsx";

export interface KeyboardSelection {
  file: string;
  platform: Platform;
  variant: DeviceVariant;
  layer: string;
}

export interface KeyboardPickerProps {
  kbd: string;
  combos: LayoutCombo[];
  initialFile: string;
  initialPlatform: Platform;
  initialVariant: DeviceVariant;
  initialLayer?: string;
  /** Scale keyboard to this pixel width for the no-JS render. Once hydrated,
   * the keyboard re-fits itself to its container via ResizeObserver. */
  requestedWidth?: number;
  /** Fired whenever the live file/platform/variant/layer selection changes
   * (including once on mount with the initial selection) — lets a host page
   * track what's currently showing, e.g. to build an "embed this" URL or
   * fetch the raw YAML for the active layout file. Optional; has no effect
   * on rendering. */
  onSelectionChange?: (selection: KeyboardSelection) => void;
}

function resolveFile(combos: LayoutCombo[], initialFile: string): string {
  return combos.some((c) => c.file === initialFile)
    ? initialFile
    : combos[0].file;
}

function resolvePlatform(
  combo: LayoutCombo,
  initialPlatform: Platform,
): Platform {
  return combo.platformCombos.some((c) => c.platform === initialPlatform)
    ? initialPlatform
    : combo.platformCombos[0].platform;
}

function resolveVariant(
  combo: PlatformCombo,
  initialVariant: DeviceVariant,
): DeviceVariant {
  return combo.variantCombos.some((c) => c.variant === initialVariant)
    ? initialVariant
    : combo.variantCombos[0].variant;
}

function resolveLayer(layerNames: string[], initialLayer: string): string {
  return layerNames.includes(initialLayer) ? initialLayer : "default";
}

/** Narrows `scope` down to the DOM subtree for one tab item at `dimension`,
 * matching the `kbd-${dimension}-view-${id}` class CssTabPicker's
 * `generateTabCss` emits on each view wrapper. Falls back to `scope`
 * unchanged when that dimension collapsed to a single item (no tab bar, no
 * wrapper — see CssTabPicker's `items.length <= 1` shortcut).
 *
 * Callers MUST chain each call through the previously-narrowed scope (never
 * call this against `root` directly for anything but the layout level) —
 * the view-wrapper class isn't uid-qualified, so it's only unambiguous
 * within an already-narrowed ancestor. */
function narrowScope(
  scope: Element,
  dimension: "layout" | "platform" | "variant",
  id: string,
): Element {
  return scope.querySelector(`.kbd-${dimension}-view-${slugifyId(id)}`) ??
    scope;
}

/** Finds the DOM subtree currently showing (file, platform, variant) — the
 * scope a layer radio for that combo must live inside. Used both by the
 * mount-time DOM-adoption effect and by `setLayer`'s hardware-driven radio
 * write. */
function findActiveScope(
  root: Element,
  combos: LayoutCombo[],
  file: string,
  platform: Platform,
  variant: DeviceVariant,
): Element {
  const layoutScope = combos.length > 1
    ? narrowScope(root, "layout", file)
    : root;
  const layoutCombo = combos.find((c) => c.file === file);
  const platformCombo = layoutCombo?.platformCombos.find((c) =>
    c.platform === platform
  );
  const platformScope = (layoutCombo?.platformCombos.length ?? 0) > 1
    ? narrowScope(layoutScope, "platform", platform)
    : layoutScope;
  return (platformCombo?.variantCombos.length ?? 0) > 1
    ? narrowScope(platformScope, "variant", variant)
    : platformScope;
}

/**
 * Hydratable renderer for the FULL layout → platform → variant → layer tab
 * tree — generalizes <Keyboard>'s single-pinned-layout typing/hardware-
 * capture/resize behavior across every combo `StaticKeyboardLayoutPicker`
 * renders. <Keyboard> itself is a thin wrapper over this component with a
 * one-entry `combos` array (see Keyboard.tsx).
 *
 * Server-rendered, the whole tree is a complete zero-JS keyboard (every
 * layout/platform/variant/layer combo pre-rendered, switched by hidden
 * radios and :checked CSS — see CssTabPicker), plus a test text area that
 * only becomes visible under `@media (scripting: enabled)`. Hydrated, wires
 * are attached: key clicks and deadkey composition type into the text area
 * (dispatched against whichever combo is currently active), hardware keys
 * are captured only while the text area is focused, held hardware modifiers
 * switch the visible layer, and a ResizeObserver re-fits the keyboard to its
 * container.
 */
export function KeyboardPicker({
  kbd,
  combos,
  initialFile,
  initialPlatform,
  initialVariant,
  initialLayer = "default",
  requestedWidth,
  onSelectionChange,
}: KeyboardPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [checkedFile, setCheckedFile] = useState(() =>
    resolveFile(combos, initialFile)
  );
  const [checkedPlatform, setCheckedPlatform] = useState(() => {
    const combo = combos.find((c) => c.file === checkedFile) ?? combos[0];
    return resolvePlatform(combo, initialPlatform);
  });
  const [checkedVariant, setCheckedVariant] = useState(() => {
    const combo = combos.find((c) => c.file === checkedFile) ?? combos[0];
    const pCombo = combo.platformCombos.find((c) =>
      c.platform === checkedPlatform
    ) ?? combo.platformCombos[0];
    return resolveVariant(pCombo, initialVariant);
  });
  const [checkedLayer, setCheckedLayer] = useState(() => {
    const combo = combos.find((c) => c.file === checkedFile) ?? combos[0];
    const pCombo = combo.platformCombos.find((c) =>
      c.platform === checkedPlatform
    ) ?? combo.platformCombos[0];
    const vCombo = pCombo.variantCombos.find((c) =>
      c.variant === checkedVariant
    ) ?? pCombo.variantCombos[0];
    return resolveLayer(vCombo.layers.map((l) => l.name), initialLayer);
  });
  const [pressedKeyId, setPressedKeyId] = useState<string | null>(null);
  const [pendingDeadkey, setPendingDeadkey] = useState<string | null>(null);
  const [fitWidth, setFitWidth] = useState<number | undefined>(requestedWidth);

  const layoutCombo = useMemo(
    () => combos.find((c) => c.file === checkedFile) ?? combos[0],
    [combos, checkedFile],
  );
  const platformCombo = useMemo(
    () =>
      layoutCombo.platformCombos.find((c) => c.platform === checkedPlatform) ??
        layoutCombo.platformCombos[0],
    [layoutCombo, checkedPlatform],
  );
  const variantCombo = useMemo(
    () =>
      platformCombo.variantCombos.find((c) => c.variant === checkedVariant) ??
        platformCombo.variantCombos[0],
    [platformCombo, checkedVariant],
  );
  const activeLayout: KeyboardLayout = variantCombo.layout;
  const activeLayers = variantCombo.layers;

  // Adopt whatever layout/platform/variant/layer radio the user checked
  // between paint and hydration — generalizes <Keyboard>'s single-dimension
  // version of this trick to all four tab levels. Preact's hydrate pass
  // doesn't diff attributes, but the first state-driven re-render would
  // reset every `checked` back to our initial state, so read the DOM's
  // truth first.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let file = checkedFile;
    if (combos.length > 1) {
      const checked = root.querySelector<HTMLInputElement>(
        "input.dvk-radio[data-layout-file]:checked",
      );
      const domFile = checked?.getAttribute("data-layout-file");
      if (domFile && combos.some((c) => c.file === domFile)) file = domFile;
    }
    const combo = combos.find((c) => c.file === file) ?? combos[0];
    const layoutScope = combos.length > 1
      ? narrowScope(root, "layout", file)
      : root;

    let platform = checkedPlatform;
    if (combo.platformCombos.length > 1) {
      const checked = layoutScope.querySelector<HTMLInputElement>(
        "input.dvk-radio[data-platform]:checked",
      );
      const domPlatform = checked?.getAttribute("data-platform") as
        | Platform
        | undefined;
      if (
        domPlatform &&
        combo.platformCombos.some((c) => c.platform === domPlatform)
      ) {
        platform = domPlatform;
      }
    }
    const pCombo = combo.platformCombos.find((c) => c.platform === platform) ??
      combo.platformCombos[0];
    const platformScope = combo.platformCombos.length > 1
      ? narrowScope(layoutScope, "platform", pCombo.platform)
      : layoutScope;

    let variant = checkedVariant;
    if (pCombo.variantCombos.length > 1) {
      const checked = platformScope.querySelector<HTMLInputElement>(
        "input.dvk-radio[data-variant]:checked",
      );
      const domVariant = checked?.getAttribute("data-variant") as
        | DeviceVariant
        | undefined;
      if (
        domVariant &&
        pCombo.variantCombos.some((c) => c.variant === domVariant)
      ) {
        variant = domVariant;
      }
    }
    const vCombo = pCombo.variantCombos.find((c) => c.variant === variant) ??
      pCombo.variantCombos[0];
    const variantScope = pCombo.variantCombos.length > 1
      ? narrowScope(platformScope, "variant", vCombo.variant)
      : platformScope;

    const checkedLayerRadio = variantScope.querySelector<HTMLInputElement>(
      "input.dvk-radio[data-layer]:checked",
    );
    const domLayer = checkedLayerRadio?.getAttribute("data-layer");
    const layer = domLayer && vCombo.layers.some((l) => l.name === domLayer)
      ? domLayer
      : checkedLayer;

    if (file !== checkedFile) setCheckedFile(file);
    if (pCombo.platform !== checkedPlatform) {
      setCheckedPlatform(pCombo.platform);
    }
    if (vCombo.variant !== checkedVariant) {
      setCheckedVariant(vCombo.variant);
    }
    if (layer !== checkedLayer) setCheckedLayer(layer);
  }, []);

  // Re-validate checked state whenever `combos` itself changes (e.g. a host
  // page live-editing pasted YAML and re-parsing it into new combos on every
  // keystroke, without remounting this component — remounting would reset
  // fitWidth and flash the keyboard to full natural size for a frame).
  // Without this, if the specific file/platform/variant/layer the user has
  // selected disappears from the new combos (edited away), the DERIVED
  // activeLayout/activeLayers above still safely fall back — but the raw
  // checkedFile/checkedPlatform/checkedVariant/checkedLayer state passed
  // down to the picker tree for tab-highlighting and click-wiring does not,
  // since StaticKeyboardLayoutPicker etc. use `checkedXProp ?? fallback`
  // and always receive a defined value once mounted. Left unhandled, the
  // checked radio's item would no longer exist at all — and since those
  // radios aren't given a `key` prop, Preact's position-based list
  // reconciliation can leave a *different*, arbitrary item's DOM node
  // inheriting the stale "checked" state, which then diverges from what
  // hardware typing actually dispatches against (each independently
  // resolved). For the unchanged (embed.tsx, borealium) case where `combos`
  // is a stable prop set once, this effect only fires on mount and is a
  // no-op there too, matching what the lazy useState initializers already
  // computed. Skips its own first run: on initial mount, this and the
  // DOM-adoption effect above both fire in the same commit, but this one
  // would use THIS render's (pre-adoption) checkedLayer closure rather than
  // whatever the adoption effect just read from the DOM — its DOM-forcing
  // step below would then immediately clobber a pre-hydration layer switch
  // the adoption effect just adopted, since combos doesn't change again to
  // give this effect a second chance to reconcile. The adoption effect
  // already fully owns getting the very first commit right; this one only
  // needs to matter for genuine post-mount combos changes.
  const isFirstCombosRun = useRef(true);
  useEffect(() => {
    if (isFirstCombosRun.current) {
      isFirstCombosRun.current = false;
      return;
    }

    const file = resolveFile(combos, checkedFile);
    const combo = combos.find((c) => c.file === file) ?? combos[0];
    const platform = resolvePlatform(combo, checkedPlatform);
    const pCombo = combo.platformCombos.find((c) => c.platform === platform) ??
      combo.platformCombos[0];
    const variant = resolveVariant(pCombo, checkedVariant);
    const vCombo = pCombo.variantCombos.find((c) => c.variant === variant) ??
      pCombo.variantCombos[0];
    const layer = resolveLayer(vCombo.layers.map((l) => l.name), checkedLayer);

    if (file !== checkedFile) setCheckedFile(file);
    if (platform !== checkedPlatform) setCheckedPlatform(platform);
    if (variant !== checkedVariant) setCheckedVariant(variant);
    if (layer !== checkedLayer) setCheckedLayer(layer);

    // The radios are uncontrolled (defaultChecked, never re-applied by
    // Preact on prop updates — see CssTabPicker's own comment on why), so
    // correcting the state above doesn't by itself fix what's visibly
    // checked: if the previously-checked item's radio no longer exists at
    // all, a *different* item's DOM node can end up inheriting its
    // "checked" state via the position-based reconciliation above. Force
    // the DOM to match, the same way setLayer already does below for
    // hardware-driven layer switches — checking a radio natively unchecks
    // its same-`name` siblings, so nothing needs manually unchecking here.
    const root = rootRef.current;
    if (!root) return;
    if (combos.length > 1) {
      const radio = root.querySelector<HTMLInputElement>(
        `input.dvk-radio[data-layout-file="${file}"]`,
      );
      if (radio && !radio.checked) radio.checked = true;
    }
    const layoutScope = combos.length > 1
      ? narrowScope(root, "layout", file)
      : root;
    if (combo.platformCombos.length > 1) {
      const radio = layoutScope.querySelector<HTMLInputElement>(
        `input.dvk-radio[data-platform="${platform}"]`,
      );
      if (radio && !radio.checked) radio.checked = true;
    }
    const platformScope = combo.platformCombos.length > 1
      ? narrowScope(layoutScope, "platform", platform)
      : layoutScope;
    if (pCombo.variantCombos.length > 1) {
      const radio = platformScope.querySelector<HTMLInputElement>(
        `input.dvk-radio[data-variant="${variant}"]`,
      );
      if (radio && !radio.checked) radio.checked = true;
    }
    const variantScope = pCombo.variantCombos.length > 1
      ? narrowScope(platformScope, "variant", variant)
      : platformScope;
    const layerRadio = variantScope.querySelector<HTMLInputElement>(
      `input.dvk-radio[data-layer="${layer}"]`,
    );
    if (layerRadio && !layerRadio.checked) layerRadio.checked = true;
  }, [combos]);

  // Re-fit the keyboard to the container it actually landed in.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const w = root.clientWidth;
      if (w > 0) setFitWidth(w);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  // Let a host page track the live selection (e.g. to build an embed URL or
  // fetch raw YAML for the active file) without needing to reach into the
  // DOM itself.
  useEffect(() => {
    onSelectionChange?.({
      file: checkedFile,
      platform: checkedPlatform,
      variant: checkedVariant,
      layer: checkedLayer,
    });
  }, [checkedFile, checkedPlatform, checkedVariant, checkedLayer]);

  const handleFileChange = (file: string) => {
    const combo = combos.find((c) => c.file === file) ?? combos[0];
    const platform = resolvePlatform(combo, checkedPlatform);
    const pCombo = combo.platformCombos.find((c) => c.platform === platform)!;
    const variant = resolveVariant(pCombo, checkedVariant);
    const vCombo = pCombo.variantCombos.find((c) => c.variant === variant)!;
    const layer = resolveLayer(vCombo.layers.map((l) => l.name), checkedLayer);
    setCheckedFile(file);
    setCheckedPlatform(platform);
    setCheckedVariant(variant);
    setCheckedLayer(layer);
  };

  const handlePlatformChange = (platform: Platform) => {
    const pCombo = layoutCombo.platformCombos.find((c) =>
      c.platform === platform
    )!;
    const variant = resolveVariant(pCombo, checkedVariant);
    const vCombo = pCombo.variantCombos.find((c) => c.variant === variant)!;
    const layer = resolveLayer(vCombo.layers.map((l) => l.name), checkedLayer);
    setCheckedPlatform(platform);
    setCheckedVariant(variant);
    setCheckedLayer(layer);
  };

  const handleVariantChange = (variant: DeviceVariant) => {
    const vCombo = platformCombo.variantCombos.find((c) =>
      c.variant === variant
    )!;
    const layer = resolveLayer(vCombo.layers.map((l) => l.name), checkedLayer);
    setCheckedVariant(variant);
    setCheckedLayer(layer);
  };

  const deadkeys = activeLayout.deadkeys ?? {};

  const insert = (text: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    ta.setRangeText(text, start, end, "end");
    ta.focus();
  };

  const outputChar = (char: string) => {
    if (pendingDeadkey !== null) {
      const combined = deadkeys[pendingDeadkey]?.[char] ?? null;
      insert(combined ?? pendingDeadkey + char);
      setPendingDeadkey(null);
      return;
    }
    if (deadkeys[char]) {
      setPendingDeadkey(char);
      return;
    }
    insert(char);
  };

  const flushPendingDeadkey = () => {
    if (pendingDeadkey !== null) {
      insert(pendingDeadkey);
      setPendingDeadkey(null);
    }
  };

  const handleKeyClick = (key: Key) => {
    if (key.id === BACKSPACE_KEY) {
      if (pendingDeadkey !== null) {
        setPendingDeadkey(null);
      } else if (taRef.current) {
        deleteBackward(taRef.current);
        taRef.current.focus();
      }
      return;
    }
    if (key.id === ENTER_KEY) {
      flushPendingDeadkey();
      insert("\n");
      return;
    }
    if (key.id === TAB_KEY) {
      flushPendingDeadkey();
      insert("\t");
      return;
    }
    const output = getKeyOutput(key, checkedLayer);
    if (output) outputChar(output);
  };

  const layerFromEvent = (e: KeyboardEvent): string => {
    return getActiveLayer({
      shift: e.shiftKey,
      caps: e.getModifierState?.("CapsLock") ?? false,
      alt: e.altKey,
      cmd: e.metaKey,
      ctrl: e.ctrlKey,
    });
  };

  // Switch layers by driving the same DOM radio the no-JS machinery uses.
  // The radios are uncontrolled (see StaticKeyboardEmbed), so JS writes the
  // DOM directly and mirrors the value into state for aria attributes and
  // key-output computation. Scoped to the currently active layout/platform/
  // variant subtree, since `data-layer` values collide textually across
  // every leaf in the tree — only the surrounding radio id (prefixed by the
  // layout's synthetic id) is unique.
  const setLayer = (name: string) => {
    // The overwhelming majority of keydown/keyup events don't change the
    // layer (plain letters with no modifiers held) — bail before touching
    // state or the DOM so typing doesn't pay for a layer switch it isn't
    // making.
    if (name === checkedLayer) return;
    setCheckedLayer(name);
    const root = rootRef.current;
    if (!root) return;
    const scope = findActiveScope(
      root,
      combos,
      checkedFile,
      checkedPlatform,
      checkedVariant,
    );
    const radio = scope.querySelector<HTMLInputElement>(
      `input.dvk-radio[data-layer="${name}"]`,
    );
    if (radio && !radio.checked) radio.checked = true;
  };

  const syncLayerFromEvent = (e: KeyboardEvent) => {
    const name = layerFromEvent(e);
    if (activeLayers.some((l) => l.name === name)) setLayer(name);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    syncLayerFromEvent(e);

    // Never swallow OS/browser shortcuts (copy, paste, tab-away, …).
    if (e.metaKey || e.ctrlKey) return;

    const key = findKeyByCode(activeLayout, e.code);
    if (!key) return; // arrows, etc. — leave native behavior alone

    if (isModifierKey(key.id)) {
      setPressedKeyId(key.id);
      return;
    }
    if (key.id === BACKSPACE_KEY) {
      setPressedKeyId(key.id);
      if (pendingDeadkey !== null) {
        e.preventDefault();
        setPendingDeadkey(null);
      }
      return; // otherwise native backspace
    }
    if (key.id === ENTER_KEY) {
      setPressedKeyId(key.id);
      if (pendingDeadkey !== null) {
        e.preventDefault();
        insert(pendingDeadkey + "\n");
        setPendingDeadkey(null);
      }
      return; // otherwise native newline
    }
    if (key.id === TAB_KEY) {
      return; // never trap Tab — keyboard users must be able to leave
    }

    const layerName = layerFromEvent(e);
    const output = getKeyOutput(
      key,
      activeLayers.some((l) => l.name === layerName) ? layerName : checkedLayer,
    );
    if (output) {
      e.preventDefault();
      setPressedKeyId(key.id);
      outputChar(output);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    syncLayerFromEvent(e);
    setPressedKeyId(null);
  };

  return (
    <div ref={rootRef} class="dvk dvk-keyboard">
      <div class="dvk-input">
        <textarea
          ref={taRef}
          class="dvk-input-field"
          placeholder="Click keys or type here to test the keyboard"
          aria-label="Keyboard test area"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck={false}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        />
      </div>
      <StaticKeyboardLayoutPicker
        kbd={kbd}
        combos={combos}
        initialFile={initialFile}
        initialPlatform={initialPlatform}
        initialVariant={initialVariant}
        initialLayer={initialLayer}
        requestedWidth={fitWidth}
        checkedFile={checkedFile}
        onFileChange={handleFileChange}
        checkedPlatform={checkedPlatform}
        onPlatformChange={handlePlatformChange}
        checkedVariant={checkedVariant}
        onVariantChange={handleVariantChange}
        embedHydration={{
          checkedLayer,
          onLayerChange: setCheckedLayer,
          onKeyClick: handleKeyClick,
          pressedKeyId,
          pendingDeadkey,
        }}
      />
    </div>
  );
}
