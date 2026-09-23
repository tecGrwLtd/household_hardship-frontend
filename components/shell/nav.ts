import {
  ClipboardCheck,
  Cpu,
  FileText,
  Home,
  LayoutDashboard,
  Scale,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: "queue";
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/review", label: "Review queue", icon: ClipboardCheck, badge: "queue" },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/households", label: "Households", icon: Home },
  { href: "/cycles", label: "Funding cycles", icon: CalendarRange },
  { href: "/fairness", label: "Fairness audit", icon: Scale },
  { href: "/model", label: "Model", icon: Cpu, adminOnly: true },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
