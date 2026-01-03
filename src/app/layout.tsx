import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
