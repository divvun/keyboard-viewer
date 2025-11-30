import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async GET(req) {
    try {
      const url = new URL(req.url);
      const langCode = url.searchParams.get("repo");

      if (!langCode) {
        return Response.json(
          { error: "Missing 'repo' parameter" },
          { status: 400 }
        );
      }

      // Get GitHub token from environment if available
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      const headers: Record<string, string> = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "keyboard-viewer",
      };

      // Add authorization header if token is available
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }

      // Fetch contents of the layouts directory
      const response = await fetch(
        `https://api.github.com/repos/giellalt/keyboard-${langCode}/contents/${langCode}.kbdgen/layouts`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return Response.json(
            { error: "Layouts directory not found" },
            { status: 404 }
          );
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const contents = await response.json();

      // Filter for .yaml files
      const layoutFiles = contents
        .filter((file: { name: string; type: string }) =>
          file.type === "file" && file.name.endsWith(".yaml")
        )
        .map((file: { name: string }) => ({
          name: file.name,
          displayName: file.name.replace(".yaml", ""),
        }))
        .sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        );

      return Response.json(layoutFiles);
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  },
});
