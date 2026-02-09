import { CircleHelp, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import type { LinkStatus } from "@/src/types/bookmark";

export default function LinkStatusBadge({ status }: { status: LinkStatus | null }) {
  if (!status || status === "unchecked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" title="Not checked">
        <CircleHelp className="h-3 w-3" />
        Unchecked
      </span>
    );
  }

  if (status === "valid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400" title="Link is valid">
        <CheckCircle className="h-3 w-3" />
        Valid
      </span>
    );
  }

  if (status === "broken") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400" title="Link is broken">
        <XCircle className="h-3 w-3" />
        Broken
      </span>
    );
  }

  if (status === "timeout") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title="Request timed out">
        <Clock className="h-3 w-3" />
        Timeout
      </span>
    );
  }

  if (status === "redirect") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" title="URL redirects">
        <ArrowRight className="h-3 w-3" />
        Redirect
      </span>
    );
  }

  return null;
}
