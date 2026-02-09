"use client";

import { useState, useEffect, useCallback } from "react";
import { Folder, FolderOpen, ChevronRight, Loader2 } from "lucide-react";

// Types
interface FolderCount {
  folder: string | null;
  count: number;
}

interface FoldersResponse {
  folders: FolderCount[];
  total: number;
}

interface TreeNode {
  name: string;
  path: string;
  count: number;
  children: TreeNode[];
}

interface FolderTreeProps {
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
}

// Build tree structure from flat folder paths
function buildFolderTree(folders: FolderCount[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Sort folders to ensure parents are processed before children
  const sortedFolders = [...folders]
    .filter((f) => f.folder !== null)
    .sort((a, b) => (a.folder ?? "").localeCompare(b.folder ?? ""));

  for (const { folder, count } of sortedFolders) {
    if (!folder) continue;

    const parts = folder.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const node: TreeNode = {
          name: part,
          path: currentPath,
          count: 0,
          children: [],
        };
        nodeMap.set(currentPath, node);

        if (parentPath) {
          const parent = nodeMap.get(parentPath);
          if (parent) {
            parent.children.push(node);
          }
        } else {
          root.push(node);
        }
      }

      // Set count on the full path node
      if (i === parts.length - 1) {
        const node = nodeMap.get(currentPath);
        if (node) {
          node.count = count;
        }
      }
    }
  }

  // Sort children alphabetically
  function sortAndCalculate(nodes: TreeNode[]): void {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortAndCalculate(node.children);
    }
  }

  sortAndCalculate(root);

  return root;
}

// Individual folder tree item component
function FolderTreeItem({
  node,
  level,
  selectedFolder,
  onSelectFolder,
  expandedFolders,
  toggleExpanded,
}: {
  node: TreeNode;
  level: number;
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  expandedFolders: Set<string>;
  toggleExpanded: (path: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFolder === node.path;

  // Calculate total count including children
  const getTotalCount = (n: TreeNode): number => {
    let total = n.count;
    for (const child of n.children) {
      total += getTotalCount(child);
    }
    return total;
  };

  const totalCount = getTotalCount(node);

  return (
    <div>
      <button
        onClick={() => onSelectFolder(node.path)}
        className={`group flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.path);
            }}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.name} folder`}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Folder icon */}
        {isExpanded || isSelected ? (
          <FolderOpen
            className={`h-4 w-4 flex-shrink-0 ${
              isSelected
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          />
        ) : (
          <Folder
            className={`h-4 w-4 flex-shrink-0 ${
              isSelected
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          />
        )}

        {/* Folder name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Bookmark count */}
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
            isSelected
              ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          {totalCount}
        </span>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              onSelectFolder={onSelectFolder}
              expandedFolders={expandedFolders}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({
  selectedFolder,
  onSelectFolder,
}: FolderTreeProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");

      const data: FoldersResponse = await res.json();

      // Build tree from folder data
      const folderTree = buildFolderTree(data.folders);
      setTree(folderTree);
      setTotalBookmarks(data.total);

      // Count uncategorized (null folder) bookmarks
      const uncategorized = data.folders.find((f) => f.folder === null);
      setUncategorizedCount(uncategorized?.count ?? 0);

      // Auto-expand first level if small number of folders
      if (folderTree.length <= 10) {
        const expanded = new Set<string>();
        folderTree.forEach((node) => {
          if (node.children.length > 0) {
            expanded.add(node.path);
          }
        });
        setExpandedFolders(expanded);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const toggleExpanded = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-hidden="true" />
        <span className="sr-only">Loading folders</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchFolders}
          className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <nav aria-label="Folder navigation" className="flex flex-col gap-1">
      {/* All Bookmarks */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
          selectedFolder === null
            ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <span className="w-5 flex-shrink-0" />
        <Folder
          className={`h-4 w-4 flex-shrink-0 ${
            selectedFolder === null
              ? "text-blue-600 dark:text-blue-400"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        />
        <span className="flex-1">All Bookmarks</span>
        <span
          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
            selectedFolder === null
              ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          {totalBookmarks}
        </span>
      </button>

      {/* Uncategorized */}
      {uncategorizedCount > 0 && (
        <button
          onClick={() => onSelectFolder("")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
            selectedFolder === ""
              ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          <span className="w-5 flex-shrink-0" />
          <Folder
            className={`h-4 w-4 flex-shrink-0 ${
              selectedFolder === ""
                ? "text-blue-600 dark:text-blue-400"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          />
          <span className="flex-1 italic text-zinc-500 dark:text-zinc-400">
            Uncategorized
          </span>
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${
              selectedFolder === ""
                ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
            }`}
          >
            {uncategorizedCount}
          </span>
        </button>
      )}

      {/* Divider */}
      {tree.length > 0 && (
        <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
      )}

      {/* Folder tree */}
      {tree.map((node) => (
        <FolderTreeItem
          key={node.path}
          node={node}
          level={0}
          selectedFolder={selectedFolder}
          onSelectFolder={onSelectFolder}
          expandedFolders={expandedFolders}
          toggleExpanded={toggleExpanded}
        />
      ))}

      {/* Empty state */}
      {tree.length === 0 && uncategorizedCount === 0 && totalBookmarks === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No folders yet
        </p>
      )}
    </nav>
  );
}
