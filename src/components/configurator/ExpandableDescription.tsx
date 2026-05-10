"use client";

import { useState } from "react";

/**
 * Renders a Shopify product's HTML description with a "Show more / Show less"
 * toggle when the plain-text length exceeds `maxChars` (default 350).
 * When collapsed, line-clamp keeps the HTML formatting intact (links, bold,
 * paragraphs) instead of cutting raw text mid-tag.
 */
export function ExpandableDescription({
  html,
  maxChars = 350,
  className = "",
}: {
  html: string;
  maxChars?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Strip tags + collapse whitespace to measure user-visible content length.
  const plainTextLength = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim().length;

  const needsToggle = plainTextLength > maxChars;
  const showCollapsed = needsToggle && !expanded;

  return (
    <div className={className}>
      <div
        className={
          showCollapsed
            ? "line-clamp-4 [&_p+p]:mt-2"
            : "[&_p+p]:mt-2"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          {expanded ? (
            <>
              Show less
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </>
          ) : (
            <>
              Show more
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
