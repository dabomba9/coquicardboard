import type { JsonLdObject } from "@/lib/structured-data";

// Renders a schema.org JSON-LD <script>. Escapes "<" so the JSON can never break
// out of the script element.
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
