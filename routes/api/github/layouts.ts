import { define, getErrorMessage } from "../../../utils.ts";
import { listLayoutFiles } from "../../../utils/list-layouts.ts";

export const handler = define.handlers({
  async GET(req) {
    const url = new URL(req.url);
    const repo = url.searchParams.get("repo");

    if (!repo) {
      return Response.json(
        { error: "Missing 'repo' parameter" },
        { status: 400 },
      );
    }

    try {
      const files = await listLayoutFiles(repo);
      return Response.json(
        files.map((f) => ({ name: `${f.file}.yaml`, displayName: f.file })),
      );
    } catch (error) {
      const message = getErrorMessage(error);
      const status = message === "Layouts directory not found" ? 404 : 500;
      return Response.json({ error: message }, { status });
    }
  },
});
