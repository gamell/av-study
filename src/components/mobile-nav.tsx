"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";
import { cn } from "@/lib/utils";

/**
 * Fixed bottom tab bar for phones (hidden on >=sm). Keeps the primary
 * destinations within thumb reach instead of crammed into the top bar, and
 * respects the home-indicator safe area.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-safe pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:hidden"
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-13 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="leading-none">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
