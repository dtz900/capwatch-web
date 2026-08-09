interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

// JSON.stringify does not escape "<" (0x3c) or the U+2028/U+2029 line separators,
// so a capper-supplied string (X display_name / handle) containing "</script>"
// would break out of the ld+json <script> tag and execute. Escape those chars
// before injecting. Zero visual/SEO change: crawlers parse the \u escapes back to
// the same characters. Regex is built from char codes to keep this source ASCII.
const UNSAFE_SCRIPT_CHARS = new RegExp(
  "[" + String.fromCharCode(0x3c, 0x2028, 0x2029) + "]",
  "g",
);

function safeJsonLd(node: unknown): string {
  return JSON.stringify(node).replace(
    UNSAFE_SCRIPT_CHARS,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

export function JsonLd({ data }: JsonLdProps) {
  const nodes = Array.isArray(data) ? data : [data];
  return (
    <>
      {nodes.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(node) }}
        />
      ))}
    </>
  );
}
