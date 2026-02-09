// Extract search terms for highlighting (excludes field prefixes)
export function extractSearchTerms(searchQuery: string): string[] {
  if (!searchQuery) return [];

  const terms: string[] = [];
  // Remove field:value patterns and collect values and remaining terms
  const fieldPattern = /(\w+):(?:"([^"]+)"|(\S+))/g;
  let lastIndex = 0;
  let match;

  while ((match = fieldPattern.exec(searchQuery)) !== null) {
    // Add text before this match
    const textBefore = searchQuery.slice(lastIndex, match.index).trim();
    if (textBefore) {
      terms.push(...textBefore.split(/\s+/).filter(Boolean));
    }
    lastIndex = match.index + match[0].length;

    // Add the value from field:value (useful for highlighting)
    const value = match[2] || match[3];
    if (value) {
      terms.push(value);
    }
  }

  // Add remaining text
  const textAfter = searchQuery.slice(lastIndex).trim();
  if (textAfter) {
    terms.push(...textAfter.split(/\s+/).filter(Boolean));
  }

  return terms;
}

export default function HighlightedText({
  text,
  searchTerms,
  className = "",
}: {
  text: string;
  searchTerms: string[];
  className?: string;
}) {
  if (!text || searchTerms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex pattern from search terms, escaping special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = searchTerms
    .filter((term) => term.length > 0)
    .map(escapeRegex)
    .join("|");

  if (!pattern) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}
