import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Export Bookmarks",
};

export default function ExportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
