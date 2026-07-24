/**
 * Proves the "hydration only attaches wires" contract of the unified
 * <Keyboard> component: a layer switch the user makes via the no-JS radio
 * machinery BEFORE hydration must survive hydration and the first
 * state-driven re-render — the component adopts the DOM's radio state
 * instead of clobbering it back to its initial props.
 */
import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { Window } from "happy-dom";
import { Keyboard } from "@divvun/keyboard";
import { enumerateLayers } from "@divvun/keyboard";
import type { KeyboardLayout } from "@divvun/keyboard";

const layout: KeyboardLayout = {
  id: "test-kbd",
  name: "Test",
  deadkeys: {},
  rows: [
    {
      keys: [
        { id: "KeyA", layers: { default: "a", shift: "A" }, width: 1 },
        { id: "KeyB", layers: { default: "b", shift: "B" }, width: 1 },
      ],
    },
    {
      keys: [
        { id: "ShiftLeft", layers: { default: "" }, label: "⇧", width: 1.5 },
      ],
    },
  ],
};

// deno-lint-ignore no-explicit-any
type Anything = any;

async function hydrateInDom(
  preClickShift: boolean,
): Promise<{ radios: Anything[]; host: Anything }> {
  const layers = enumerateLayers(layout);
  assertEquals(layers.map((l) => l.name), ["default", "shift"]);
  const props = { layout, layers, initialLayer: "default" };

  const html = renderToString(h(Keyboard, props as Anything));
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `<div id="host">${html}</div>`;
  (globalThis as Anything).document = document;
  (globalThis as Anything).window = window;
  (globalThis as Anything).requestAnimationFrame = (cb: () => void) =>
    setTimeout(cb, 0);

  const host = document.getElementById("host") as Anything;
  const radios = [...host.querySelectorAll("input.dvk-radio")] as Anything[];
  assertEquals(radios.length, 2);
  assertEquals(radios[0].getAttribute("data-layer"), "default");
  assertEquals(radios[1].getAttribute("data-layer"), "shift");

  // Sanity: the SSR markup itself must carry the initial checked state.
  assertEquals(radios[0].checked, true);
  assertEquals(radios[1].checked, false);

  if (preClickShift) {
    // What a browser does natively when the user clicks the "Shift" tab
    // label before the island's JS has loaded.
    radios[0].checked = false;
    radios[1].checked = true;
  }

  const { hydrate } = await import("preact");
  hydrate(h(Keyboard, props as Anything), host);
  // Let hydration effects (DOM-state adoption) and the re-render they
  // trigger run to completion. preact/hooks captures requestAnimationFrame
  // at module load — before our shim exists — so effects flush via its
  // 100ms setTimeout fallback.
  await new Promise((r) => setTimeout(r, 250));

  return { radios, host };
}

Deno.test({
  name: "pre-hydration layer switch survives hydration",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { radios, host } = await hydrateInDom(true);

    assertEquals(radios[1].checked, true, "shift radio must stay checked");
    assertEquals(radios[0].checked, false, "default radio must stay off");

    // The adopted state must drive the post-hydration render: the tab
    // reflects the DOM's layer, not the initial props.
    const shiftTab = host.querySelector('label[data-tab-id="shift"]');
    assertEquals(shiftTab.getAttribute("aria-selected"), "true");
    const defaultTab = host.querySelector('label[data-tab-id="default"]');
    assertEquals(defaultTab.getAttribute("aria-selected"), "false");
  },
});

Deno.test({
  name: "hydration without pre-click keeps the initial layer",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { radios, host } = await hydrateInDom(false);

    assertEquals(radios[0].checked, true);
    assertEquals(radios[1].checked, false);
    const defaultTab = host.querySelector('label[data-tab-id="default"]');
    assertEquals(defaultTab.getAttribute("aria-selected"), "true");
  },
});
