import type { Metadata } from "next";
import type { ReactNode } from "react";

// Private / transactional pages: keep them out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NoIndexLayout({ children }: { children: ReactNode }) {
  return children;
}
