"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/src/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-16 items-center rounded-full border border-zinc-300 bg-zinc-100 p-1 transition-colors dark:border-zinc-700 dark:bg-zinc-800"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span
        className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-600 ${
          theme === "dark" ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {theme === "light" ? (
          <Sun className="h-4 w-4 text-amber-500" />
        ) : (
          <Moon className="h-4 w-4 text-blue-400" />
        )}
      </span>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
