function githubAuthHeader(): Record<string, string> {
  const token = Deno.env.get("GITHUB_TOKEN");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

/** Headers for calls to api.github.com (REST/search endpoints). */
export function githubApiHeaders(): Record<string, string> {
  return {
    "Accept": "application/vnd.github+json",
    "User-Agent": "keyboard-viewer",
    ...githubAuthHeader(),
  };
}

/** Headers for calls to raw.githubusercontent.com — no Accept header, since
 * that's a GitHub REST API content-negotiation header and this isn't the
 * REST API. */
export function githubRawHeaders(): Record<string, string> {
  return {
    "User-Agent": "keyboard-viewer",
    ...githubAuthHeader(),
  };
}
