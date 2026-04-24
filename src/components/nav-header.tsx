"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, BookOpen, BarChart3, FileText, Database } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncStatus } from "@/components/sync-status";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Plane },
  { href: "/study/knowledge", label: "Knowledge Test", icon: BookOpen },
  { href: "/study/oral", label: "Checkride Oral", icon: BookOpen },
  { href: "/review-text", label: "Study Texts", icon: FileText },
  { href: "/database", label: "Database", icon: Database },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-2 font-bold">
          <Plane className="h-5 w-5 text-primary" />
          <span>Pilot Study</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === item.href
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <SyncStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
