import { define, getErrorMessage } from "../../../utils.ts";
import { parse as parseYaml } from "jsr:@std/yaml";
import {
  getAvailablePlatforms,
  type KbdgenLayout,
  transformKbdgenToLayout,
} from "../../../utils/kbdgen-transform.ts";

export const handler = define.handlers({
  async GET(req) {
    try {
      const url = new URL(req.url);
      const langCode = url.searchParams.get("repo");
      const layoutFile = url.searchParams.get("file");
      const platform = url.searchParams.get("platform") || "macOS";

      if (!langCode || !layoutFile) {
        return Response.json(
          { error: "Missing 'repo' or 'file' parameter" },
          { status: 400 },
        );
      }

      // Get GitHub token from environment if available
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      const headers: Record<string, string> = {
        "User-Agent": "keyboard-viewer",
      };

      // Add authorization header if token is available
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }

      // Fetch the YAML file from GitHub
      const response = await fetch(
        `https://raw.githubusercontent.com/giellalt/keyboard-${langCode}/refs/heads/main/${langCode}.kbdgen/layouts/${layoutFile}`,
        { headers },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return Response.json(
            { error: "Layout file not found" },
            { status: 404 },
          );
        }
        throw new Error(`GitHub fetch error: ${response.statusText}`);
      }

      const yamlContent = await response.text();
      const kbdgenData = parseYaml(yamlContent) as KbdgenLayout;

      // Get available platforms
      const availablePlatforms = getAvailablePlatforms(kbdgenData);

      if (availablePlatforms.length === 0) {
        return Response.json(
          { error: "No platforms found in layout file" },
          { status: 400 },
        );
      }

      // Use requested platform or default to macOS if available
      const selectedPlatform = availablePlatforms.includes(platform)
        ? platform
        : availablePlatforms[0];

      // Transform to our internal format
      const layoutName = layoutFile.replace(".yaml", "");
      const transformedLayout = transformKbdgenToLayout(
        kbdgenData,
        selectedPlatform,
        langCode,
        layoutName,
      );

      return Response.json({
        layout: transformedLayout,
        availablePlatforms,
        selectedPlatform,
        rawYaml: yamlContent,
      });
    } catch (error) {
      return Response.json(
        { error: getErrorMessage(error) },
        { status: 500 },
      );
    }
  },
});
