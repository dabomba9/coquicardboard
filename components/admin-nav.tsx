import Link from "next/link";
import { cn } from "@/lib/utils";

// Sub-nav shared by the admin pages; the main nav's single "Admin" link lands on
// either one.
const LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/images", label: "Images" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin" className="mb-6 flex gap-4 text-sm">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.href === current ? "page" : undefined}
          className={cn("hover:text-foreground", l.href === current ? "font-semibold text-accent" : "text-muted")}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
