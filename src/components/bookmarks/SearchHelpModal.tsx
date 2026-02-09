import { HelpCircle, X } from "lucide-react";

export default function SearchHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="search-help-modal-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 id="search-help-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Search Syntax Help
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <p className="text-zinc-600 dark:text-zinc-400">
            Use special prefixes to search within specific fields:
          </p>

          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">title:react</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in bookmark titles
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">url:github</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in URLs
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">folder:Work</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Filter by folder name
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">tag:important</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Filter by tag
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <code className="font-mono text-blue-600 dark:text-blue-400">notes:todo</code>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Search only in notes/description
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
            <p className="font-medium text-blue-900 dark:text-blue-100">Examples:</p>
            <ul className="mt-2 space-y-1.5 text-blue-700 dark:text-blue-300">
              <li><code className="font-mono">folder:Work tag:urgent react</code></li>
              <li><code className="font-mono">title:&quot;API Documentation&quot;</code></li>
              <li><code className="font-mono">url:docs.github</code></li>
            </ul>
          </div>

          <p className="text-zinc-500 dark:text-zinc-400">
            Use quotes for multi-word values: <code className="font-mono">folder:&quot;My Projects&quot;</code>
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
