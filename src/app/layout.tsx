import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { ThemeToggle } from "@/src/components/ThemeToggle";

export const metadata: Metadata = {
  title: "BookmarkHub",
  description: "Centralized bookmark management across all your browsers",
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
          <div className="fixed right-4 top-4 z-50">
            <ThemeToggle />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
