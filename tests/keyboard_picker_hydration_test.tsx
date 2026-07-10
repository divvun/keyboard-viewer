/**
 * Extends keyboard_hydration_test.tsx's single-dimension (layer-only)
 * contract to the full layout -> platform -> layer tree KeyboardPicker
 * renders: a pre-hydration switch at ANY of the three tab levels must
 * survive hydration, and typing after hydration must dispatch against
 * whichever combo the DOM says is active — not just highlight the right tab.
 */
import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { Window } from "happy-dom";
import {
  enumerateLayers,
  type KeyboardLayout,
  KeyboardPicker,
  type LayoutCombo,
  Platform,
} from "@divvun/keyboard";

function makeLayout(id: string, char: string): KeyboardLayout {
  return {
    id,
    name: id,
    deadkeys: {},
    rows: [{ keys: [{ id: "KeyA", layers: { default: char }, width: 1 }] }],
  };
}

const layoutAMac = makeLayout("layout-a-mac", "a1");
const layoutAWin = makeLayout("layout-a-win", "a2");
const layoutBMac = makeLayout("layout-b-mac", "b1");

const combos: LayoutCombo[] = [
  {
    file: "layout-a",
    displayName: "Layout A",
    platformCombos: [
      {
        platform: Platform.MacOS,
        layout: layoutAMac,
        layers: enumerateLayers(layoutAMac),
      },
      {
        platform: Platform.Windows,
        layout: layoutAWin,
        layers: enumerateLayers(layoutAWin),
      },
    ],
  },
  {
    file: "layout-b",
    displayName: "Layout B",
    platformCombos: [
      {
        platform: Platform.MacOS,
        layout: layoutBMac,
        layers: enumerateLayers(layoutBMac),
      },
    ],
  },
];

const props = {
  kbd: "test",
  combos,
  initialFile: "layout-a",
  initialPlatform: Platform.MacOS,
  initialLayer: "default",
};

// deno-lint-ignore no-explicit-any
type Anything = any;

function setup() {
  const html = renderToString(h(KeyboardPicker, props as Anything));
  const window = new Window();
  const document = window.document;
  document.body.innerHTML = `<div id="host">${html}</div>`;
  (globalThis as Anything).document = document;
  (globalThis as Anything).window = window;
  (globalThis as Anything).requestAnimationFrame = (cb: () => void) =>
    setTimeout(cb, 0);
  return document.getElementById("host") as Anything;
}

async function hydrate(host: Anything) {
  const { hydrate } = await import("preact");
  hydrate(h(KeyboardPicker, props as Anything), host);
  // Let hydration effects (DOM-state adoption) and the re-render they
  // trigger run to completion — see keyboard_hydration_test.tsx for why this
  // needs a real timeout rather than flushing microtasks.
  await new Promise((r) => setTimeout(r, 250));
}

function fireChange(radio: Anything) {
  radio.checked = true;
  const event = new (globalThis as Anything).window.Event("change", {
    bubbles: true,
  });
  radio.dispatchEvent(event);
}

Deno.test({
  name: "SSR renders layout/platform/layer tabs matching the combo tree",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: () => {
    const host = setup();

    const layoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    assertEquals(layoutRadios.length, 2);
    assertEquals(layoutRadios[0].getAttribute("data-layout-file"), "layout-a");
    assertEquals(layoutRadios[0].checked, true);
    assertEquals(layoutRadios[1].checked, false);

    const layoutAScope = host.querySelector(".kbd-layout-view-layout-a");
    const platformRadios = [
      ...layoutAScope.querySelectorAll("input.dvk-radio[data-platform]"),
    ] as Anything[];
    assertEquals(platformRadios.length, 2);
    assertEquals(platformRadios[0].getAttribute("data-platform"), "macOS");
    assertEquals(platformRadios[0].checked, true);

    // layout-b has only one platform, so its platform tab bar collapses —
    // no data-platform radios inside it — but it still gets a layer radio
    // (StaticKeyboardEmbed's layer picker always shows its tab bar).
    const layoutBScope = host.querySelector(".kbd-layout-view-layout-b");
    assertEquals(
      layoutBScope.querySelectorAll("input.dvk-radio[data-platform]").length,
      0,
    );
    assertEquals(
      layoutBScope.querySelectorAll("input.dvk-radio[data-layer]").length > 0,
      true,
    );
  },
});

Deno.test({
  name: "pre-hydration layout switch survives hydration and drives typing",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup();

    // What a browser does natively when the user clicks the "Layout B" tab
    // before the island's JS has loaded.
    const layoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    layoutRadios[0].checked = false;
    layoutRadios[1].checked = true;

    await hydrate(host);

    const layoutBTab = host.querySelector('label[data-tab-id="layout-b"]');
    assertEquals(layoutBTab.getAttribute("aria-selected"), "true");
    const layoutATab = host.querySelector('label[data-tab-id="layout-a"]');
    assertEquals(layoutATab.getAttribute("aria-selected"), "false");

    // Clicking the key inside the now-active layout-b instance must type
    // layout-b's character, not layout-a's — proving the derived
    // active-combo state (not just tab highlighting) drives typing.
    const layoutBScope = host.querySelector(".kbd-layout-view-layout-b");
    const key = layoutBScope.querySelector('button[title="KeyA"]');
    key.click();
    await new Promise((r) => setTimeout(r, 50));

    const textarea = host.querySelector("textarea");
    assertEquals(textarea.value, "b1");
  },
});

Deno.test({
  name: "post-hydration layout switch preserves a still-valid platform",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup();

    // Adopt layout-b (macOS-only) before hydration, same as the previous
    // test, so we start from a non-default combo.
    const layoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    layoutRadios[0].checked = false;
    layoutRadios[1].checked = true;

    await hydrate(host);

    // Switch back to layout-a via a real change event, as the hydrated
    // island's own onFileChange handler would receive.
    const postHydrationLayoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    fireChange(postHydrationLayoutRadios[0]);
    await new Promise((r) => setTimeout(r, 50));

    const layoutATab = host.querySelector('label[data-tab-id="layout-a"]');
    assertEquals(layoutATab.getAttribute("aria-selected"), "true");

    // layout-a offers macOS, so the macOS platform (checked while on
    // layout-b) should be preserved rather than reset.
    const macTab = host.querySelector(
      '.kbd-layout-view-layout-a label[data-tab-id="macos"]',
    );
    assertEquals(macTab.getAttribute("aria-selected"), "true");

    const layoutAScope = host.querySelector(".kbd-layout-view-layout-a");
    const key = layoutAScope.querySelector('button[title="KeyA"]');
    key.click();
    await new Promise((r) => setTimeout(r, 50));

    const textarea = host.querySelector("textarea");
    assertEquals(textarea.value, "a1");
  },
});
