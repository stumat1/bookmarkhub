import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { ThemeToggle } from "@/src/components/ThemeToggle";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/src/components/GlobalErrorHandler";

export const metadata: Metadata = {
  title: {
    default: "BookmarkHub",
    template: "%s | BookmarkHub",
  },
  description: "Centralized bookmark management across all your browsers. Import, organize, search, and export bookmarks with ease.",
  metadataBase: new URL("http://localhost:3000"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ErrorBoundary>
            <GlobalErrorHandler />
            <a
              href="#main-content"
              className="skip-nav"
            >
              Skip to main content
            </a>
            <div className="fixed right-4 top-4 z-50">
              <ThemeToggle />
            </div>
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
