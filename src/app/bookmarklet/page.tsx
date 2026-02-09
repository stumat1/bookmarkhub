"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  GripVertical,
  CheckCircle,
  Info,
  Copy,
  ExternalLink,
} from "lucide-react";
import { BOOKMARKLET_POPUP, COPY_FEEDBACK_DELAY_MS } from "@/src/lib/constants";

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false);

  // Get the base URL - only available on client
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Generate the bookmarklet code
  const bookmarkletCode = baseUrl
    ? `javascript:(function(){var url=encodeURIComponent(window.location.href);var title=encodeURIComponent(document.title);var w=${BOOKMARKLET_POPUP.width},h=${BOOKMARKLET_POPUP.height};var left=(screen.width-w)/2;var top=(screen.height-h)/2;window.open('${baseUrl}/quick-add?url='+url+'&title='+title,'BookmarkHub','width='+w+',height='+h+',left='+left+',top='+top+',toolbar=no,menubar=no,scrollbars=yes,resizable=yes');})();`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DELAY_MS);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = bookmarkletCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DELAY_MS);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/uri-list", bookmarkletCode);
    e.dataTransfer.setData("text/plain", bookmarkletCode);
  };

  return (
    <main id="main-content" className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Quick Add Bookmarklet
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Save bookmarks from any webpage with one click
          </p>
        </div>

        {/* Bookmarklet Button */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Your Bookmarklet
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            {/* Draggable Bookmarklet Link */}
            <a
              href={bookmarkletCode}
              draggable="true"
              onDragStart={handleDragStart}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing select-none"
            >
              <GripVertical className="w-4 h-4 opacity-70" aria-hidden="true" />
              <Bookmark className="w-5 h-5" aria-hidden="true" />
              <span>Add to BookmarkHub</span>
            </a>

            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Info className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Drag this button to your bookmarks bar</span>
            </div>
          </div>

          {/* Copy Code Alternative */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Or copy the bookmarklet code manually:
            </p>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 font-mono overflow-x-auto whitespace-nowrap">
                {bookmarkletCode}
              </code>
              <button
                onClick={handleCopy}
                aria-label={copied ? "Copied to clipboard" : "Copy bookmarklet code"}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Installation Instructions
          </h2>

          <div className="space-y-6">
            {/* Chrome */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-xs font-bold text-yellow-700 dark:text-yellow-300">
                  C
                </span>
                Google Chrome
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1.5 ml-8">
                <li>Make sure the bookmarks bar is visible (<kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+B</kbd> or <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">Cmd+Shift+B</kbd>)</li>
                <li>Drag the &quot;Add to BookmarkHub&quot; button to your bookmarks bar</li>
                <li>The bookmarklet will appear as a bookmark you can click</li>
              </ol>
            </div>

            {/* Firefox */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-300">
                  F
                </span>
                Mozilla Firefox
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1.5 ml-8">
                <li>Show the bookmarks toolbar: <strong>View</strong> &rarr; <strong>Toolbars</strong> &rarr; <strong>Bookmarks Toolbar</strong></li>
                <li>Drag the &quot;Add to BookmarkHub&quot; button to your bookmarks toolbar</li>
                <li>Click it on any page to save a bookmark</li>
              </ol>
            </div>

            {/* Edge */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                  E
                </span>
                Microsoft Edge
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1.5 ml-8">
                <li>Show the favorites bar: press <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+B</kbd></li>
                <li>Drag the &quot;Add to BookmarkHub&quot; button to the favorites bar</li>
                <li>Use it on any webpage to quickly add bookmarks</li>
              </ol>
            </div>

            {/* Safari */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300">
                  S
                </span>
                Safari
              </h3>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1.5 ml-8">
                <li>Show the favorites bar: <strong>View</strong> &rarr; <strong>Show Favorites Bar</strong></li>
                <li>Click the &quot;Copy&quot; button above to copy the bookmarklet code</li>
                <li>Create a new bookmark (<kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">Cmd+D</kbd>) and name it &quot;Add to BookmarkHub&quot;</li>
                <li>Edit the bookmark and paste the code into the URL field</li>
              </ol>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            How It Works
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Visit Any Page
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Browse to any webpage you want to save
              </p>
            </div>

            <div className="text-center p-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Click the Bookmarklet
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Click &quot;Add to BookmarkHub&quot; in your bookmarks bar
              </p>
            </div>

            <div className="text-center p-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
              </div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Save with Details
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Add folder, tags, and notes before saving
              </p>
            </div>
          </div>
        </div>

        {/* Test It Out */}
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Test It Out
              </h2>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                After installing the bookmarklet, try it on any webpage. A popup will open with the page&apos;s URL and title pre-filled.
              </p>
              <Link
                href="/quick-add?url=https%3A%2F%2Fexample.com&title=Example%20Page"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ExternalLink className="w-4 h-4" />
                Preview the Quick Add form
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
