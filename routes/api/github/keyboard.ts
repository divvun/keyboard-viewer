import { define, getErrorMessage, getErrorStatus } from "../../../utils.ts";
import {
  buildKeyboardComboTree,
  DEFAULT_PLATFORM,
  DEFAULT_VARIANT,
} from "@divvun/keyboard";

/**
 * Builds the full layout x platform x variant combo tree for a repo — the
 * only endpoint the root page's picker needs for the GitHub-sourced path.
 * Mirrors exactly what borealium.org's own resource-page route does
 * server-side; this just exposes it as JSON for a client island to fetch.
 */
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
      const tree = await buildKeyboardComboTree({
        kbd: repo,
        layout: "",
        platform: DEFAULT_PLATFORM,
        variant: DEFAULT_VARIANT,
      });
      return Response.json(tree);
    } catch (error) {
      return Response.json(
        { error: getErrorMessage(error) },
        { status: getErrorStatus(error) },
      );
    }
  },
});
