import { Chrome, Globe } from "lucide-react";

export default function BrowserIcon({ browser }: { browser: string | null }) {
  const lowerBrowser = browser?.toLowerCase() ?? "";
  if (lowerBrowser.includes("chrome")) {
    return <Chrome className="h-4 w-4 text-yellow-500" />;
  }
  if (lowerBrowser.includes("firefox")) {
    return (
      <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  if (lowerBrowser.includes("safari")) {
    return (
      <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  if (lowerBrowser.includes("edge")) {
    return (
      <svg className="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    );
  }
  return <Globe className="h-4 w-4 text-zinc-400" />;
}
