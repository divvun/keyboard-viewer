import { define, getErrorMessage } from "../../../utils.ts";
import { fetchKbdgenData, LayoutNotFoundError } from "@divvun/keyboard";

/** Returns a single layout file's raw kbdgen YAML text, for an on-demand
 * "View YAML" panel. Backed by fetchKbdgenData's own cache, so this never
 * costs an extra GitHub fetch beyond what building the combo tree already
 * did for the same (repo, file). */
export const handler = define.handlers({
  async GET(req) {
    const url = new URL(req.url);
    const repo = url.searchParams.get("repo");
    const file = url.searchParams.get("file");

    if (!repo || !file) {
      return Response.json(
        { error: "Missing 'repo' or 'file' parameter" },
        { status: 400 },
      );
    }

    try {
      const { rawYaml } = await fetchKbdgenData(repo, file);
      return Response.json({ rawYaml });
    } catch (error) {
      const status = error instanceof LayoutNotFoundError ? 404 : 500;
      return Response.json({ error: getErrorMessage(error) }, { status });
    }
  },
});
