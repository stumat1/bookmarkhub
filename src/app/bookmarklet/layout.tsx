import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Add Bookmarklet",
};

export default function BookmarkletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
