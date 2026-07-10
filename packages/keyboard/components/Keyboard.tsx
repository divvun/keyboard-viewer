import { useEffect, useRef, useState } from "preact/hooks";
import type { Key, KeyboardLayout } from "../types/keyboard-simple.ts";
import type { LayerState } from "../utils/layer-state.ts";
import { StaticKeyboardEmbed } from "./StaticKeyboardEmbed.tsx";
import { getKeyOutput, isModifierKey } from "../utils/key-helpers.ts";
import { getActiveLayer } from "../utils/modifiers.ts";
import { BACKSPACE_KEY, ENTER_KEY, TAB_KEY } from "../constants/key-ids.ts";

export interface KeyboardProps {
  layout: KeyboardLayout;
  layers: LayerState[];
  initialLayer?: string;
  /** Scale keyboard to this pixel width for the no-JS render. Once hydrated,
   * the keyboard re-fits itself to its container via ResizeObserver. */
  requestedWidth?: number;
}

function findKeyByCode(layout: KeyboardLayout, code: string): Key | undefined {
  for (const row of layout.rows) {
    const key = row.keys.find((k) => k.id === code);
    if (key) return key;
  }
  return undefined;
}

/** Delete one code point before the cursor (or the selection, if any). */
function deleteBackward(ta: HTMLTextAreaElement) {
  const start = ta.selectionStart ?? ta.value.length;
  const end = ta.selectionEnd ?? ta.value.length;
  if (start !== end) {
    ta.setRangeText("", start, end, "end");
    return;
  }
  if (start === 0) return;
  const prev = ta.value.codePointAt(start - 2 >= 0 ? start - 2 : 0);
  const isSurrogatePair = start >= 2 && prev !== undefined && prev > 0xffff;
  ta.setRangeText("", start - (isSurrogatePair ? 2 : 1), start, "end");
}

/**
 * THE keyboard component — the same artifact in every environment.
 *
 * Server-rendered, it is a complete zero-JS keyboard: every layer
 * pre-rendered, switched by hidden radios and :checked CSS (all inherited
 * from StaticKeyboardEmbed), plus a test text area that only becomes visible
 * under `@media (scripting: enabled)` — so a no-JS browser never sees a text
 * area that couldn't work.
 *
 * Hydrated (wrapped in an island), nothing about the markup changes; wires
 * are attached to it:
 * - key clicks insert the key's output (deadkey composition included) into
 *   the text area
 * - hardware keys are captured ONLY while the text area is focused —
 *   listeners live on the <textarea>, never on document/window — and produce
 *   the layout's characters instead of the host keyboard's
 * - held hardware modifiers switch the visible layer by driving the same
 *   radio state the no-JS machinery uses; the radios stay the single source
 *   of truth
 * - a ResizeObserver re-fits the keyboard to its container
 */
export function Keyboard({
  layout,
  layers,
  initialLayer = "default",
  requestedWidth,
}: KeyboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [checkedLayer, setCheckedLayer] = useState(
    layers.some((l) => l.name === initialLayer) ? initialLayer : "default",
  );
  const [pressedKeyId, setPressedKeyId] = useState<string | null>(null);
  const [pendingDeadkey, setPendingDeadkey] = useState<string | null>(null);
  const [fitWidth, setFitWidth] = useState<number | undefined>(requestedWidth);

  // Adopt whatever layer radio the user checked between paint and hydration.
  // Preact's hydrate pass doesn't diff attributes, but the first
  // state-driven re-render would reset `checked` to our initial state — so
  // read the DOM's truth before that can happen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Read the checked property per element rather than a :checked selector:
    // checkedness is live state, and property reads are the reliable way to
    // observe it across DOM implementations.
    for (
      const radio of root.querySelectorAll<HTMLInputElement>("input.dvk-radio")
    ) {
      const domLayer = radio.getAttribute("data-layer");
      if (
        radio.checked && domLayer && layers.some((l) => l.name === domLayer)
      ) {
        setCheckedLayer(domLayer);
        break;
      }
    }
  }, []);

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

  const deadkeys = layout.deadkeys ?? {};

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

  // Which layer do the currently-held hardware modifiers select?
  const layerFromEvent = (e: KeyboardEvent): string => {
    return getActiveLayer({
      shift: e.shiftKey,
      caps: e.getModifierState?.("CapsLock") ?? false,
      alt: e.altKey,
      cmd: e.metaKey,
      ctrl: e.ctrlKey,
    });
  };

  // Switch layers by driving the same DOM radios the no-JS machinery uses.
  // The radios are uncontrolled (see StaticKeyboardEmbed), so JS writes the
  // DOM directly and mirrors the value into state for aria attributes and
  // key-output computation.
  const setLayer = (name: string) => {
    setCheckedLayer(name);
    const radio = rootRef.current?.querySelector<HTMLInputElement>(
      `input.dvk-radio[data-layer="${name}"]`,
    );
    if (radio && !radio.checked) radio.checked = true;
  };

  const syncLayerFromEvent = (e: KeyboardEvent) => {
    const name = layerFromEvent(e);
    if (layers.some((l) => l.name === name)) setLayer(name);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    syncLayerFromEvent(e);

    // Never swallow OS/browser shortcuts (copy, paste, tab-away, …).
    if (e.metaKey || e.ctrlKey) return;

    const key = findKeyByCode(layout, e.code);
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
      layers.some((l) => l.name === layerName) ? layerName : checkedLayer,
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
      <StaticKeyboardEmbed
        layout={layout}
        layers={layers}
        initialLayer={initialLayer}
        requestedWidth={fitWidth}
        checkedLayer={checkedLayer}
        onLayerChange={setCheckedLayer}
        onKeyClick={handleKeyClick}
        pressedKeyId={pressedKeyId}
        pendingDeadkey={pendingDeadkey}
      />
    </div>
  );
}
