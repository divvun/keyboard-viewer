import { assertEquals } from "jsr:@std/assert@^1.0.14";
import {
  buildLayoutComboFromKbdgenData,
  DeviceVariant,
  Platform,
} from "@divvun/keyboard";
import type { KbdgenLayout } from "@divvun/keyboard";

// A minimal but structurally real fixture: one desktop platform (single
// implicit "primary" variant) and one mobile platform declaring two device
// variants — exercises both branches of buildLayoutComboFromKbdgenData's
// per-platform variant enumeration without hitting the network.
const fixture: KbdgenLayout = {
  displayNames: { en: "Test Layout" },
  macOS: {
    primary: { layers: { default: "a b\nc d" } },
  },
  iOS: {
    primary: { layers: { default: "1 2" } },
    "iPad-9in": { layers: { default: "3 4" } },
  },
};

Deno.test("buildLayoutComboFromKbdgenData sets file/displayName from its arguments", () => {
  const combo = buildLayoutComboFromKbdgenData(
    fixture,
    "test",
    "test-layout",
    "Test Layout",
  );
  assertEquals(combo.file, "test-layout");
  assertEquals(combo.displayName, "Test Layout");
});

Deno.test("buildLayoutComboFromKbdgenData enumerates every available platform", () => {
  const combo = buildLayoutComboFromKbdgenData(
    fixture,
    "test",
    "test-layout",
    "x",
  );
  assertEquals(
    combo.platformCombos.map((c) => c.platform),
    [Platform.MacOS, Platform.IOS],
  );
});

Deno.test("buildLayoutComboFromKbdgenData gives a desktop platform exactly one (primary) variant", () => {
  const combo = buildLayoutComboFromKbdgenData(
    fixture,
    "test",
    "test-layout",
    "x",
  );
  const macCombo = combo.platformCombos.find((c) =>
    c.platform === Platform.MacOS
  )!;
  assertEquals(macCombo.variantCombos.length, 1);
  assertEquals(macCombo.variantCombos[0].variant, DeviceVariant.Primary);
  assertEquals(macCombo.variantCombos[0].layers.length > 0, true);
});

Deno.test("buildLayoutComboFromKbdgenData enumerates every declared mobile variant", () => {
  const combo = buildLayoutComboFromKbdgenData(
    fixture,
    "test",
    "test-layout",
    "x",
  );
  const iosCombo = combo.platformCombos.find((c) =>
    c.platform === Platform.IOS
  )!;
  assertEquals(
    iosCombo.variantCombos.map((c) => c.variant),
    [DeviceVariant.Primary, DeviceVariant.IPad9in],
  );
  for (const vc of iosCombo.variantCombos) {
    assertEquals(vc.layers.length > 0, true);
  }
});
