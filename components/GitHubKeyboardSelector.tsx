export interface Repo {
  code: string;
  name: string;
  description: string;
}

interface GitHubKeyboardSelectorProps {
  repos: Repo[];
  reposLoading: boolean;
  reposError: string | null;
  selectedRepo: string;
  onRepoSelected: (repo: string) => void;
}

/**
 * Picks which giellalt keyboard-xxx repo to view. That's it — once a repo is
 * chosen, `<KeyboardPicker>` itself owns layout/platform/variant/layer
 * selection via its own tab bars, so this doesn't need to (and used to)
 * cascade through separate layout/platform/variant `<select>`s.
 */
export function GitHubKeyboardSelector(
  { repos, reposLoading, reposError, selectedRepo, onRepoSelected }:
    GitHubKeyboardSelectorProps,
) {
  return (
    <div class="w-full space-y-4 p-3 md:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-gray-800">Load from GitHub</h2>
          {reposLoading && (
            <div
              class="spinner flex-shrink-0"
              style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #4b5563; border-radius: 50%;"
            />
          )}
        </div>
        <p class="text-sm text-gray-600 mt-1">
          Load a keyboard layout directly from a GiellaLT keyboard-xxx repo
        </p>
      </div>

      {reposError && (
        <div class="p-2 md:p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
          Error: {reposError}
        </div>
      )}

      <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
        <label class="text-sm font-semibold text-gray-700 text-left md:text-right md:w-40 md:flex-shrink-0">
          Select Language
        </label>
        <select
          value={selectedRepo}
          onChange={(e) =>
            onRepoSelected((e.target as HTMLSelectElement).value)}
          disabled={reposLoading || repos.length === 0}
          class="flex-1 p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">-- Select a language --</option>
          {repos.map((repo) => {
            const cleanDescription = repo.description
              .split(/\s+/)
              .filter((word) =>
                !["keyboards", "for", "the", "language", "layout", "keyboard"]
                  .includes(word.toLowerCase())
              )
              .join(" ")
              .trim();
            return (
              <option key={repo.code} value={repo.code}>
                {repo.code} - {cleanDescription || repo.code}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
