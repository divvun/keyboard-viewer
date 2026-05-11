import { define, getErrorMessage } from "../../../utils.ts";
import {
  LayoutNotFoundError,
  loadKeyboardLayout,
} from "../../../utils/load-layout.ts";
import {
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
  DeviceVariant,
  Platform,
} from "../../../constants/platforms.ts";

export const handler = define.handlers({
  async GET(req) {
    try {
      const url = new URL(req.url);
      const kbd = url.searchParams.get("repo");
      const layoutFile = url.searchParams.get("file");
      const platform = (url.searchParams.get("platform") as Platform) ||
        DEFAULT_PLATFORM;
      const variant = (url.searchParams.get("variant") as DeviceVariant) ||
        DEFAULT_VARIANT;

      if (!kbd || !layoutFile) {
        return Response.json(
          { error: "Missing 'repo' or 'file' parameter" },
          { status: 400 },
        );
      }

      const layout = layoutFile.replace(/\.yaml$/, "");
      const loaded = await loadKeyboardLayout({ kbd, layout, platform, variant });

      return Response.json({
        layout: loaded.layout,
        availablePlatforms: loaded.availablePlatforms,
        availableVariants: loaded.availableVariants,
        selectedPlatform: loaded.selectedPlatform,
        selectedVariant: loaded.selectedVariant,
        rawYaml: loaded.rawYaml,
      });
    } catch (error) {
      const status = error instanceof LayoutNotFoundError ? 404 : 500;
      return Response.json({ error: getErrorMessage(error) }, { status });
    }
  },
});
