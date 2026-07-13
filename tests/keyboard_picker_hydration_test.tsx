/**
 * Extends keyboard_hydration_test.tsx's single-dimension (layer-only)
 * contract to the full layout -> platform -> variant -> layer tree
 * KeyboardPicker renders: a pre-hydration switch at ANY tab level must
 * survive hydration, and typing after hydration must dispatch against
 * whichever combo the DOM says is active — not just highlight the right tab.
 */
import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.14";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { Window } from "happy-dom";
import {
  DeviceVariant,
  enumerateLayers,
  type KeyboardLayout,
  KeyboardPicker,
  type KeyboardPickerProps,
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

// deno-lint-ignore no-explicit-any
type Anything = any;

function setup(props: KeyboardPickerProps) {
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

async function hydrate(host: Anything, props: KeyboardPickerProps) {
  const { hydrate } = await import("preact");
  hydrate(h(KeyboardPicker, props as Anything), host);
  // Let hydration effects (DOM-state adoption) and the re-render they
  // trigger run to completion — see keyboard_hydration_test.tsx for why this
  // needs a real timeout rather than flushing microtasks.
  await new Promise((r) => setTimeout(r, 250));
}

/** Re-renders an already-hydrated tree with new props, simulating a host
 * page passing updated `combos` (e.g. live-editing pasted YAML) without
 * remounting — the actual scenario the combos-change effect exists for. */
async function updateProps(host: Anything, props: KeyboardPickerProps) {
  const { render } = await import("preact");
  render(h(KeyboardPicker, props as Anything), host);
  await new Promise((r) => setTimeout(r, 100));
}

function fireChange(radio: Anything) {
  radio.checked = true;
  const event = new (globalThis as Anything).window.Event("change", {
    bubbles: true,
  });
  radio.dispatchEvent(event);
}

// --- Layout/platform fixture (single variant per platform throughout — the
// variant tier collapses to no tab bar, so this exercises the exact same
// DOM shape as before the variant tier was added). ---

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
        variantCombos: [{
          variant: DeviceVariant.Primary,
          layout: layoutAMac,
          layers: enumerateLayers(layoutAMac),
        }],
      },
      {
        platform: Platform.Windows,
        variantCombos: [{
          variant: DeviceVariant.Primary,
          layout: layoutAWin,
          layers: enumerateLayers(layoutAWin),
        }],
      },
    ],
  },
  {
    file: "layout-b",
    displayName: "Layout B",
    platformCombos: [
      {
        platform: Platform.MacOS,
        variantCombos: [{
          variant: DeviceVariant.Primary,
          layout: layoutBMac,
          layers: enumerateLayers(layoutBMac),
        }],
      },
    ],
  },
];

const props: KeyboardPickerProps = {
  kbd: "test",
  combos,
  initialFile: "layout-a",
  initialPlatform: Platform.MacOS,
  initialVariant: DeviceVariant.Primary,
  initialLayer: "default",
};

// --- Mobile fixture: two platforms in ONE layout file, each with >1
// variant — the exact shape that triggers the uid-collision bug if
// StaticKeyboardPlatformPicker doesn't compose the platform into the
// variant picker's uidPrefix (DeviceVariant.Primary is reused vocabulary
// across platforms, unlike layout files or platform names). ---

const iosPrimary = makeLayout("mobile-ios-primary", "ios-p");
const iosIpad = makeLayout("mobile-ios-ipad", "ios-i");
const androidPrimary = makeLayout("mobile-android-primary", "and-p");
const androidTablet = makeLayout("mobile-android-tablet", "and-t");

const mobileCombos: LayoutCombo[] = [
  {
    file: "mobile-file",
    displayName: "Mobile File",
    platformCombos: [
      {
        platform: Platform.IOS,
        variantCombos: [
          {
            variant: DeviceVariant.Primary,
            layout: iosPrimary,
            layers: enumerateLayers(iosPrimary),
          },
          {
            variant: DeviceVariant.IPad9in,
            layout: iosIpad,
            layers: enumerateLayers(iosIpad),
          },
        ],
      },
      {
        platform: Platform.Android,
        variantCombos: [
          {
            variant: DeviceVariant.Primary,
            layout: androidPrimary,
            layers: enumerateLayers(androidPrimary),
          },
          {
            variant: DeviceVariant.Tablet600,
            layout: androidTablet,
            layers: enumerateLayers(androidTablet),
          },
        ],
      },
    ],
  },
];

const mobileProps: KeyboardPickerProps = {
  kbd: "test-mobile",
  combos: mobileCombos,
  initialFile: "mobile-file",
  initialPlatform: Platform.IOS,
  initialVariant: DeviceVariant.Primary,
  initialLayer: "default",
};

Deno.test({
  name: "SSR renders layout/platform/layer tabs matching the combo tree",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: () => {
    const host = setup(props);

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

    // Every platform here has exactly one variant, so the variant tier
    // collapses too — no data-variant radios anywhere.
    assertEquals(
      host.querySelectorAll("input.dvk-radio[data-variant]").length,
      0,
    );
  },
});

Deno.test({
  name: "pre-hydration layout switch survives hydration and drives typing",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup(props);

    // What a browser does natively when the user clicks the "Layout B" tab
    // before the island's JS has loaded.
    const layoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    layoutRadios[0].checked = false;
    layoutRadios[1].checked = true;

    await hydrate(host, props);

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
    const host = setup(props);

    // Adopt layout-b (macOS-only) before hydration, same as the previous
    // test, so we start from a non-default combo.
    const layoutRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-layout-file]"),
    ] as Anything[];
    layoutRadios[0].checked = false;
    layoutRadios[1].checked = true;

    await hydrate(host, props);

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

Deno.test({
  name: "inactive combos aren't wired for typing (only the checked one is)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup(props);
    await hydrate(host, props);

    // layout-b starts inactive (layout-a/macOS is the initial combo).
    // Clicking its key must NOT type — proving KeyboardPicker only wires
    // live press/typing state into the checked combo, not every combo in
    // the tree (see StaticKeyboardLayoutPicker/StaticKeyboardPlatformPicker's
    // isActiveFile/checkedPlatform guards). Without that scoping, every
    // combo would be wired and this click would type "b1".
    const layoutBScope = host.querySelector(".kbd-layout-view-layout-b");
    const inactiveKey = layoutBScope.querySelector('button[title="KeyA"]');
    inactiveKey.click();
    await new Promise((r) => setTimeout(r, 50));

    const textarea = host.querySelector("textarea");
    assertEquals(textarea.value, "");

    // The active combo (layout-a/macOS) still works.
    const layoutAScope = host.querySelector(".kbd-layout-view-layout-a");
    const activeKey = layoutAScope.querySelector('button[title="KeyA"]');
    activeKey.click();
    await new Promise((r) => setTimeout(r, 50));

    assertEquals(textarea.value, "a1");
  },
});

Deno.test({
  name:
    "SSR renders variant tabs per platform with unique radio name/id across platforms",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: () => {
    const host = setup(mobileProps);

    const platformRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-platform]"),
    ] as Anything[];
    assertEquals(platformRadios.length, 2);

    const iosScope = host.querySelector(".kbd-platform-view-ios");
    const iosVariantRadios = [
      ...iosScope.querySelectorAll("input.dvk-radio[data-variant]"),
    ] as Anything[];
    assertEquals(iosVariantRadios.length, 2);
    assertEquals(iosVariantRadios[0].checked, true); // primary, the default

    const androidScope = host.querySelector(".kbd-platform-view-android");
    const androidVariantRadios = [
      ...androidScope.querySelectorAll("input.dvk-radio[data-variant]"),
    ] as Anything[];
    assertEquals(androidVariantRadios.length, 2);

    // The regression this guards: without StaticKeyboardPlatformPicker
    // composing the platform into the variant picker's uidPrefix, both
    // platforms' "primary" variant radio would share the same name AND id
    // (DeviceVariant.Primary is reused vocabulary across platforms).
    assertNotEquals(iosVariantRadios[0].name, androidVariantRadios[0].name);
    assertNotEquals(iosVariantRadios[0].id, androidVariantRadios[0].id);
  },
});

Deno.test({
  name:
    "switching one platform's variant doesn't affect the other platform's checked variant",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup(mobileProps);
    await hydrate(host, mobileProps);

    // If the uid-collision bug were present, checking iOS's iPad-9in radio
    // would silently uncheck Android's primary radio too (native HTML
    // radio `name` scoping is document-wide, not DOM-ancestry-based).
    const iosScope = host.querySelector(".kbd-platform-view-ios");
    const iosIpadRadio = iosScope.querySelector(
      'input.dvk-radio[data-variant="iPad-9in"]',
    );
    fireChange(iosIpadRadio);
    await new Promise((r) => setTimeout(r, 50));

    const androidScope = host.querySelector(".kbd-platform-view-android");
    const androidPrimaryRadio = androidScope.querySelector(
      'input.dvk-radio[data-variant="primary"]',
    );
    assertEquals(
      androidPrimaryRadio.checked,
      true,
      "Android's primary variant must stay checked after switching iOS's variant",
    );

    const androidTab = androidScope.querySelector(
      'label[data-tab-id="primary"]',
    );
    assertEquals(androidTab.getAttribute("aria-selected"), "true");
  },
});

Deno.test({
  name: "pre-hydration variant switch survives hydration and drives typing",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const host = setup(mobileProps);

    // What a browser does natively when the user clicks the "iPad-9in" tab
    // before the island's JS has loaded.
    const iosScope = host.querySelector(".kbd-platform-view-ios");
    const iosVariantRadios = [
      ...iosScope.querySelectorAll("input.dvk-radio[data-variant]"),
    ] as Anything[];
    iosVariantRadios[0].checked = false;
    iosVariantRadios[1].checked = true;

    await hydrate(host, mobileProps);

    const ipadTab = iosScope.querySelector('label[data-tab-id="ipad-9in"]');
    assertEquals(ipadTab.getAttribute("aria-selected"), "true");

    const ipadScope = iosScope.querySelector(".kbd-variant-view-ipad-9in");
    const key = ipadScope.querySelector('button[title="KeyA"]');
    key.click();
    await new Promise((r) => setTimeout(r, 50));

    const textarea = host.querySelector("textarea");
    assertEquals(textarea.value, "ios-i");
  },
});

Deno.test({
  name:
    "combos update removing the checked platform re-resolves to a valid one, not a stale/mismatched one",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Regression test: a host page live-editing pasted YAML re-parses on
    // every keystroke and passes updated `combos` as a prop (deliberately
    // NOT remounting KeyboardPicker — remounting would flash the keyboard
    // to full natural size for a frame, see KeyboardPicker's combos-change
    // effect doc comment). If the user's checked platform disappears from
    // an edit, the DOM's uncontrolled radios don't self-correct just
    // because state does (defaultChecked is never re-applied by Preact
    // post-mount) — without the effect's explicit DOM write, Preact's
    // un-keyed, position-based list reconciliation can leave a *different*
    // platform's DOM node inheriting the removed one's "checked" state,
    // which then disagrees with what hardware typing dispatches against.
    const macLayout = makeLayout("switch-mac", "mac-out");
    const winLayout = makeLayout("switch-win", "win-out");
    const twoPlatformCombos: LayoutCombo[] = [{
      file: "f",
      displayName: "F",
      platformCombos: [
        {
          platform: Platform.MacOS,
          variantCombos: [{
            variant: DeviceVariant.Primary,
            layout: macLayout,
            layers: enumerateLayers(macLayout),
          }],
        },
        {
          platform: Platform.Windows,
          variantCombos: [{
            variant: DeviceVariant.Primary,
            layout: winLayout,
            layers: enumerateLayers(winLayout),
          }],
        },
      ],
    }];
    const initialProps: KeyboardPickerProps = {
      kbd: "switch",
      combos: twoPlatformCombos,
      initialFile: "f",
      initialPlatform: Platform.MacOS,
      initialVariant: DeviceVariant.Primary,
      initialLayer: "default",
    };

    const host = setup(initialProps);
    await hydrate(host, initialProps);

    // Select Windows post-hydration, same as a real user clicking the tab.
    const winRadio = host.querySelector(
      'input.dvk-radio[data-platform="windows"]',
    );
    fireChange(winRadio);
    await new Promise((r) => setTimeout(r, 50));
    assertEquals(winRadio.checked, true);

    // Now the host "edits the YAML": windows disappears from combos, same
    // object identity for macOS's combo otherwise unchanged.
    const macOnlyCombos: LayoutCombo[] = [{
      file: "f",
      displayName: "F",
      platformCombos: [twoPlatformCombos[0].platformCombos[0]],
    }];
    const updatedProps: KeyboardPickerProps = {
      ...initialProps,
      combos: macOnlyCombos,
    };
    await updateProps(host, updatedProps);

    const platformRadios = [
      ...host.querySelectorAll("input.dvk-radio[data-platform]"),
    ] as Anything[];
    assertEquals(platformRadios.length, 0); // single item now — tab bar collapses entirely

    // Clicking the key in whatever's actually visible must match what
    // hardware typing dispatches against — both must agree, and both must
    // be macOS's output, not blank and not windows'.
    const visibleKey = host.querySelector('button[title="KeyA"]');
    visibleKey.click();
    await new Promise((r) => setTimeout(r, 50));
    const textarea = host.querySelector("textarea");
    assertEquals(textarea.value, "mac-out");

    textarea.value = "";
    const keydown = new (globalThis as Anything).window.KeyboardEvent(
      "keydown",
      { code: "KeyA", key: "a", bubbles: true, cancelable: true },
    );
    textarea.dispatchEvent(keydown);
    await new Promise((r) => setTimeout(r, 50));
    assertEquals(textarea.value, "mac-out");
  },
});
