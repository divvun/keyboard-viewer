import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { pickDisplayName } from "../packages/keyboard/utils/list-layouts.ts";

const displayNames = {
  se: "Davvisámegiella (Norga)",
  sma: "Noerhtesaemiengïele (Nöörje)",
  en: "Northern Sami (Norway)",
  nb: "Nordsamisk (Norge)",
};

Deno.test("pickDisplayName prefers the first matching preferred language", () => {
  assertEquals(
    pickDisplayName(displayNames, ["nb", "en"]),
    "Nordsamisk (Norge)",
  );
});

Deno.test("pickDisplayName tries preferred languages in order", () => {
  assertEquals(
    pickDisplayName(displayNames, ["fi", "sma", "en"]),
    "Noerhtesaemiengïele (Nöörje)",
  );
});

Deno.test("pickDisplayName falls back to English when nothing preferred matches", () => {
  assertEquals(
    pickDisplayName(displayNames, ["fi", "sv"]),
    "Northern Sami (Norway)",
  );
});

Deno.test("pickDisplayName returns undefined when even English is absent", () => {
  assertEquals(pickDisplayName({ nb: "x" }, ["fi"]), undefined);
});

Deno.test("pickDisplayName returns undefined for a missing displayNames map", () => {
  assertEquals(pickDisplayName(undefined, ["en"]), undefined);
});
