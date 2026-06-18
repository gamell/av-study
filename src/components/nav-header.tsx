"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncStatus } from "@/components/sync-status";
import { NAV_ITEMS } from "@/components/nav-items";
import { cn } from "@/lib/utils";

/**
 * Top app bar: brand + (on >=sm) the inline primary nav + sync/theme controls.
 * On phones the primary nav moves to the fixed bottom tab bar (`MobileNav`) so
 * the targets stay within thumb reach, so the inline links are hidden here.
 */
export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link
          href="/"
          className="mr-6 flex shrink-0 items-center gap-2 font-bold"
        >
          <Plane className="h-5 w-5 text-primary" />
          <span>Pilot Study</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-1 sm:flex-none">
          <SyncStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
