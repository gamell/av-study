import {
  Plane,
  BookOpen,
  GraduationCap,
  FileText,
  Database,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** Full label for the desktop header. */
  label: string;
  /** Short label for the compact mobile tab bar. */
  shortLabel: string;
  icon: LucideIcon;
}

/**
 * Primary navigation, shared by the desktop header and the mobile bottom bar.
 * Each route has a distinct icon (the two study decks previously shared one).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home", shortLabel: "Home", icon: Plane },
  {
    href: "/study/knowledge",
    label: "Knowledge Test",
    shortLabel: "Knowledge",
    icon: BookOpen,
  },
  {
    href: "/study/oral",
    label: "Checkride Oral",
    shortLabel: "Oral",
    icon: GraduationCap,
  },
  { href: "/review-text", label: "Study Texts", shortLabel: "Texts", icon: FileText },
  { href: "/database", label: "Database", shortLabel: "Cards", icon: Database },
  { href: "/progress", label: "Progress", shortLabel: "Progress", icon: BarChart3 },
] as const;
