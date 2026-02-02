"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileUp,
  File,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Copy,
} from "lucide-react";

// Types
interface DuplicateBookmark {
  url: string;
  title: string;
  existingId: number;
}

interface ImportResponse {
  success: boolean;
  message: string;
  imported: number;
  duplicates: DuplicateBookmark[];
  errors?: string[];
}

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Validate API response matches ImportResponse structure
function isValidImportResponse(data: unknown): data is ImportResponse {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.success !== "boolean" || typeof obj.message !== "string") {
    return false;
  }

  if (typeof obj.imported !== "number" || !Array.isArray(obj.duplicates)) {
    return false;
  }

  // Validate duplicates array structure
  for (const dup of obj.duplicates) {
    if (
      !dup ||
      typeof dup !== "object" ||
      typeof (dup as Record<string, unknown>).url !== "string" ||
      typeof (dup as Record<string, unknown>).title !== "string"
    ) {
      return false;
    }
  }

  return true;
}

export default function BookmarkUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isDragOver, setIsDragOver] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file type
  const isValidFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith(".html") || fileName.endsWith(".htm");
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!isValidFile(selectedFile)) {
      setErrorMessage("Please select an HTML file (.html or .htm)");
      setUploadState("error");
      return;
    }
    setFile(selectedFile);
    setUploadState("selected");
    setErrorMessage("");
    setResponse(null);
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Upload file
  const handleUpload = useCallback(async () => {
    if (!file) return;

    setUploadState("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Validate response structure
      if (!isValidImportResponse(data)) {
        throw new Error("Invalid response from server");
      }

      if (data.success) {
        setResponse(data);
        setUploadState("success");
      } else {
        setErrorMessage(data.message);
        setUploadState("error");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload file"
      );
      setUploadState("error");
    }
  }, [file]);

  // Reset state
  const handleReset = useCallback(() => {
    setFile(null);
    setUploadState("idle");
    setResponse(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Idle / Selected state - Show drop zone */}
      {(uploadState === "idle" || uploadState === "selected") && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`
            relative cursor-pointer rounded-xl border-2 border-dashed p-8
            transition-all duration-200 ease-in-out
            ${
              isDragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : uploadState === "selected"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            }
          `}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            {uploadState === "selected" && file ? (
              <>
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <File className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {file.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Click to select a different file
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <Upload className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Drop your bookmark file here
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Supports HTML bookmark files (.html, .htm)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload button - Show when file selected */}
      {uploadState === "selected" && file && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUpload}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
          >
            <FileUp className="h-5 w-5" />
            Import Bookmarks
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Uploading state */}
      {uploadState === "uploading" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Importing bookmarks...
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This may take a moment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {uploadState === "success" && response && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/50">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Import Successful
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  {response.message}
                </p>

                {/* Stats */}
                <div className="mt-4 flex gap-4">
                  <div className="rounded-lg bg-green-100 px-3 py-2 dark:bg-green-900/50">
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {response.imported}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Imported
                    </p>
                  </div>
                  {response.duplicates.length > 0 && (
                    <div className="rounded-lg bg-amber-100 px-3 py-2 dark:bg-amber-900/50">
                      <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                        {response.duplicates.length}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Duplicates
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Duplicates list */}
          {response.duplicates.length > 0 && (
            <div className="border-t border-green-200 dark:border-green-900">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm font-medium text-green-800 hover:bg-green-100 dark:text-green-200 dark:hover:bg-green-900/30">
                  <span className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    View {response.duplicates.length} duplicate
                    {response.duplicates.length !== 1 ? "s" : ""} skipped
                  </span>
                  <span className="transition-transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div className="max-h-48 overflow-y-auto px-6 pb-4">
                  <ul className="space-y-2 text-sm">
                    {response.duplicates.map((dup, index) => (
                      <li
                        key={index}
                        className="rounded-lg bg-white/50 p-2 dark:bg-zinc-900/50"
                      >
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {dup.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {dup.url}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          )}

          {/* Import another button */}
          <div className="border-t border-green-200 p-4 dark:border-green-900">
            <button
              onClick={handleReset}
              className="w-full rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadState === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/50">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Import Failed
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-4 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
