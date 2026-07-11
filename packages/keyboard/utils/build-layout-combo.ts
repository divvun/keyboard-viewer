import { enumerateLayers } from "./layer-state.ts";
import { DEFAULT_VARIANT } from "../constants/platforms.ts";
import {
  getAvailablePlatforms,
  getMobileVariants,
  type KbdgenLayout,
  transformKbdgenToLayout,
} from "./kbdgen-transform.ts";
import type {
  LayoutCombo,
  PlatformCombo,
  VariantCombo,
} from "../types/combo-tree.ts";

/**
 * Builds the full `{file, displayName, platformCombos: [...every platform,
 * every device variant]}` tree from an already-parsed kbdgen object.
 *
 * Pure — zero fetch, zero `Deno.*` — deliberately kept free of any
 * dependency on fetch-kbdgen.ts/list-layouts.ts/github.ts (the latter calls
 * `Deno.env.get("GITHUB_TOKEN")`), so this is safe to bundle and run
 * directly in a browser. combo-tree.ts (server-side) calls this after
 * fetching+parsing a kbdgen YAML from GitHub; a client-side pasted-YAML
 * editor can call this directly after parsing in the browser — one shared
 * code path instead of two.
 */
export function buildLayoutComboFromKbdgenData(
  kbdgenData: KbdgenLayout,
  kbd: string,
  layoutFile: string,
  displayName: string,
): LayoutCombo {
  const platformCombos: PlatformCombo[] = getAvailablePlatforms(kbdgenData)
    .map((platform) => {
      const mobileVariants = getMobileVariants(kbdgenData, platform);
      const variantNames = mobileVariants.length > 0
        ? mobileVariants
        : [DEFAULT_VARIANT];
      const variantCombos: VariantCombo[] = variantNames.map((variant) => {
        const layout = transformKbdgenToLayout(
          kbdgenData,
          platform,
          kbd,
          layoutFile,
          variant,
        );
        return { variant, layout, layers: enumerateLayers(layout) };
      });
      return { platform, variantCombos };
    });

  return { file: layoutFile, displayName, platformCombos };
}
