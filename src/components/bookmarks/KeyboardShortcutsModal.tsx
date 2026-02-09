import { Keyboard, X } from "lucide-react";

export default function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ["j"], description: "Move down in bookmark list" },
    { keys: ["k"], description: "Move up in bookmark list" },
    { keys: ["o", "Enter"], description: "Open selected bookmark" },
    { keys: ["e"], description: "Edit selected bookmark" },
    { keys: ["d"], description: "Delete selected bookmark" },
    { keys: ["f"], description: "Toggle favorite on selected bookmark" },
    { keys: ["/"], description: "Focus search input" },
    { keys: ["n"], description: "Create new bookmark" },
    { keys: ["Esc"], description: "Close modal / clear selection" },
    { keys: ["?"], description: "Show this help" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="keyboard-shortcuts-modal-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 id="keyboard-shortcuts-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Keyboard Shortcuts
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

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-zinc-400">/</span>
                    )}
                    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
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
