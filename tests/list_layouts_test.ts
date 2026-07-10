import { assertEquals } from "jsr:@std/assert@^1.0.14";
import {
  pickDisplayName,
  sortLayoutFileNames,
} from "../packages/keyboard/utils/list-layouts.ts";

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

Deno.test("sortLayoutFileNames puts the bare mobile-only file last, not first", () => {
  // Regression test: sorting after stripping ".yaml" (instead of before)
  // flips this order, since localeCompare's collation treats "se" vs
  // "se-FI" differently than "se.yaml" vs "se-FI.yaml" — the bare file is
  // mobile-only and not representative, so it must sort last (see
  // combo-tree.ts's pickDefaultLayoutFile, which just takes files[0]).
  assertEquals(
    sortLayoutFileNames(["se.yaml", "se-NO.yaml", "se-FI.yaml", "se-SE.yaml"]),
    ["se-FI", "se-NO", "se-SE", "se"],
  );
});

Deno.test("sortLayoutFileNames strips the .yaml extension", () => {
  assertEquals(sortLayoutFileNames(["smj-NO.yaml", "smj-SE.yaml"]), [
    "smj-NO",
    "smj-SE",
  ]);
});
